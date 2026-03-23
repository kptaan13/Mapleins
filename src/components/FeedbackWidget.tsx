"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

const CATEGORIES = ["Bug Report", "Feature Request", "Compliment", "Other"];

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const reset = () => {
    setRating(null);
    setHoveredRating(null);
    setCategory("");
    setMessage("");
    setEmail("");
    setStatus("idle");
  };

  const handleClose = () => {
    setOpen(false);
    if (status === "sent") reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, category: category || null, message, email, page: pathname }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const displayRating = hoveredRating ?? rating;

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#166534] text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-[#14532d] hover:shadow-xl transition-all"
        aria-label="Give feedback"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900">Share your feedback</h2>
                <p className="text-xs text-gray-400 mt-0.5">Help us make Mapleins better</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {status === "sent" ? (
              <div className="px-6 py-10 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#166534]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-black text-gray-900 text-lg mb-1">Thank you!</p>
                <p className="text-sm text-gray-500">Your feedback helps us improve Mapleins for newcomers.</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 w-full py-3 rounded-2xl bg-[#166534] text-white font-bold text-sm hover:bg-[#14532d] transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                {/* Star rating */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How would you rate your experience?</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(null)}
                        onClick={() => setRating(star)}
                        className="text-2xl transition-transform hover:scale-110"
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      >
                        <span className={displayRating !== null && star <= displayRating ? "text-yellow-400" : "text-gray-200"}>
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(category === c ? "" : c)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          category === c
                            ? "bg-[#166534] text-white border-[#166534]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-[#166534] hover:text-[#166534]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message <span className="text-red-400">*</span></p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    rows={3}
                    required
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#166534] resize-none"
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email <span className="text-gray-300">(optional)</span></p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="we'll reply if you leave your email"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-500 text-xs font-medium">Something went wrong. Please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending" || !message.trim()}
                  className="w-full py-3 rounded-2xl bg-[#166534] text-white font-bold text-sm hover:bg-[#14532d] disabled:opacity-50 transition-colors"
                >
                  {status === "sending" ? "Sending..." : "Send Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
