'use client';

import { useEffect, useRef, useState } from 'react';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Room {
  id: string;
  name: string;
}

let audioContext: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    if (!audioContext) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      audioContext = new AC();
    }
    const ctx = audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880;

    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    }, 120);
  } catch {
    // ignore audio errors
  }
}

interface MessageSender {
  display_name: string | null;
  full_name: string | null;
  username: string | null;
}

interface Message {
  id: string;
  text: string;
  created_at: string;
  sender_id: string;
  sender?: MessageSender | null;
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const [currentUserFullName, setCurrentUserFullName] = useState<string | null>(null);
  const [currentUserUsername, setCurrentUserUsername] = useState<string | null>(null);
  const [noUser, setNoUser] = useState(false);
  const [noMembership, setNoMembership] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const currentUserIdRef = useRef<string | null>(null);
  const currentUserDisplayNameRef = useRef<string | null>(null);
  const currentUserFullNameRef = useRef<string | null>(null);
  const currentUserUsernameRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      setRoomNotFound(true);
      setLoading(false);
      return;
    }

    // Reset state when roomId changes (e.g. navigating between rooms)
    setNoUser(false);
    setNoMembership(false);
    setRoomNotFound(false);
    setLoading(true);
    setRoom(null);
    setMessages([]);

    const abort = new AbortController();

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (abort.signal.aborted) return;
        if (!user) {
          setNoUser(true);
          setLoading(false);
          return;
        }
        setCurrentUserId(user.id);
        currentUserIdRef.current = user.id;

        const { data: membership } = await supabase
          .from('room_memberships')
          .select('room_id')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (abort.signal.aborted) return;
        if (!membership) {
          setNoMembership(true);
          setLoading(false);
          return;
        }

        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('id, name')
          .eq('id', roomId)
          .maybeSingle<Room>();

        if (abort.signal.aborted) return;
        if (roomError || !roomData) {
          setRoomNotFound(true);
          setLoading(false);
          return;
        }

        setRoom(roomData);

        // Load current user profile for showing our own name on new messages
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, full_name, username')
          .eq('id', user.id)
          .maybeSingle<{ display_name: string | null; full_name: string | null; username: string | null }>();
        if (abort.signal.aborted) return;
        if (profileData) {
          setCurrentUserDisplayName(profileData.display_name);
          setCurrentUserFullName(profileData.full_name);
          setCurrentUserUsername(profileData.username);
          currentUserDisplayNameRef.current = profileData.display_name;
          currentUserFullNameRef.current = profileData.full_name;
          currentUserUsernameRef.current = profileData.username;
        }

        // Two-step: fetch messages, then fetch sender profiles (no join)
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('id, text, created_at, sender_id')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (abort.signal.aborted) return;
        if (!msgError && msgData) {
          const senderIds = Array.from(new Set(msgData.map((m) => m.sender_id)));
          const { data: profileRows } = await supabase
            .from('profiles')
            .select('id, display_name, full_name, username')
            .in('id', senderIds);

          const profileMap = new Map(
            (profileRows ?? []).map((p) => [
              p.id,
              {
                display_name: p.display_name,
                full_name: p.full_name,
                username: p.username,
              } as MessageSender,
            ]),
          );

          const normalized: Message[] = msgData.map((m) => ({
            ...m,
            sender: profileMap.get(m.sender_id) ?? null,
          }));
          setMessages(normalized);
        }

        if (abort.signal.aborted) return;
        setLoading(false);
      } catch {
        if (!abort.signal.aborted) {
          setRoomNotFound(true);
          setLoading(false);
        }
      }
    };

    load();
    return () => abort.abort();
  }, [roomId]);

  // Supabase Realtime: subscribe to new messages (depends only on roomId to avoid WebSocket churn)
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const row = payload.new as { id: string; text: string; created_at: string; sender_id: string };
          const uid = currentUserIdRef.current;
          const isFromUs = uid && row.sender_id === uid;

          const senderForOwn = isFromUs
            ? {
                display_name: currentUserDisplayNameRef.current,
                full_name: currentUserFullNameRef.current,
                username: currentUserUsernameRef.current,
              }
            : null;

          // Add the message if not already present
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, sender: senderForOwn }];
          });

          scrollToBottom();

          // Play a small ping for messages from others
          if (!isFromUs) {
            playNotificationSound();
          }

          // For messages from others, fetch sender profile and attach
          if (row.sender_id && !isFromUs) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, full_name, username')
              .eq('id', row.sender_id)
              .maybeSingle();
            if (profile) {
              const sender: MessageSender = {
                display_name: profile.display_name,
                full_name: profile.full_name,
                username: profile.username,
              };
              setMessages((prev) =>
                prev.map((m) => (m.id === row.id ? { ...m, sender } : m)),
              );
            }
          }
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Realtime subscription active – new messages will appear without refresh
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[RoomPage] Realtime subscription issue:', status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !currentUserId) return;

    setSendError(null);
    setSending(true);
    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ room_id: roomId, sender_id: currentUserId, text })
      .select('id, text, created_at, sender_id')
      .maybeSingle<Message>();

    setSending(false);

    if (error) {
      setSendError('Failed to send message. Try again.');
      setInput(text);
      return;
    }
      if (data) {
      const messageWithSender: Message = {
        ...data,
        sender: {
          display_name: currentUserDisplayName,
          full_name: currentUserFullName,
          username: currentUserUsername,
        },
      };
      setMessages((prev) => [...prev, messageWithSender]);
    }
  };

  if (noUser) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-sm mapleins-card p-6 rounded-2xl shadow-card text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            You&apos;re not signed in on this device
          </h1>
          <p className="text-sm text-[var(--muted)] mb-4">
            Mapleins couldn&apos;t find an active session for this browser at
            <br />
            <code className="text-xs text-[var(--foreground)]">
              {typeof window !== 'undefined' ? window.location.origin : ''}
            </code>
            .
          </p>
          <Link
            href="/auth/sign-in"
            className="mapleins-btn-primary inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (noMembership) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-sm mapleins-card p-6 rounded-2xl shadow-card text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            You&apos;re not a member of this group
          </h1>
          <p className="text-sm text-[var(--muted)] mb-4">
            Mapleins couldn&apos;t find a room membership for this group and your
            account on this device.
          </p>
          <Link
            href="/rooms"
            className="mapleins-btn-primary inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Back to groups
          </Link>
        </div>
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--background)' }}
      >
        <div className="max-w-sm mapleins-card p-6 rounded-2xl shadow-card text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Group no longer exists
          </h1>
          <p className="text-sm text-[var(--muted)] mb-4">
            The room in this link isn&apos;t available anymore.
          </p>
          <Link
            href="/rooms"
            className="mapleins-btn-primary inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Back to groups
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !room) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <p className="text-sm text-[var(--muted)]">Loading room…</p>
      </div>
    );
  }

  const getSenderLabel = (m: Message) => {
    const un = m.sender?.username?.trim();
    const dn = m.sender?.display_name?.trim();
    const fn = m.sender?.full_name?.trim();
    const isOwn = currentUserId && m.sender_id === currentUserId;
    if (isOwn) return un ? `Me (@${un})` : 'You';
    if (dn) return dn;
    if (fn) return fn.split(/\s+/)[0] ?? fn;
    if (un) return `@${un}`;
    return 'Member';
  };

  const getInitial = (m: Message) => {
    const label = getSenderLabel(m);
    if (label.startsWith('@')) return label[1].toUpperCase();
    if (label === 'You' || label === 'Me') return 'Y';
    return label.charAt(0).toUpperCase();
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--background)' }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[var(--card)] border-b border-[var(--border-subtle)] shadow-nav">
        <Link
          href="/rooms"
          className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 -ml-1"
          aria-label="Back to groups"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-[var(--foreground)] truncate flex-1 text-center mx-2">
          {room.name}
        </h1>
        <div className="w-6" />
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[200px]"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-[var(--muted)] mb-4"
                style={{ background: 'var(--accent-muted)' }}
              >
                {room.name.charAt(0)}
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">No messages yet</p>
              <p className="text-xs text-[var(--muted)] mt-1">Start the conversation</p>
            </div>
          ) : (
            messages.map((m) => {
              const isOwn = currentUserId && m.sender_id === currentUserId;
              const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isOwn && (
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      {getInitial(m)}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] sm:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-medium text-[var(--accent)] mb-1 px-1">
                        {getSenderLabel(m)}
                      </p>
                    )}
                    <div
                      className={`inline-block px-4 py-2.5 ${
                        isOwn ? 'chat-bubble-own' : 'chat-bubble-other'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isOwn ? 'text-white opacity-90' : 'text-[var(--muted)]'
                        }`}
                      >
                        {time}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-[var(--card)] border-t border-[var(--border-subtle)]">
          {sendError && (
            <p className="mb-2 text-xs" style={{ color: 'var(--error-text)' }}>
              {sendError}
            </p>
          )}
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input
              className="flex-1 rounded-full mapleins-input px-4 py-2.5 text-sm placeholder:text-[var(--muted)]"
              placeholder="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-full mapleins-btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
