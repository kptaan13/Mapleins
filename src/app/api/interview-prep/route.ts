import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToStream } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  title: { fontSize: 24, marginBottom: 20, color: "#166534" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 8, color: "#166534" },
  text: { fontSize: 10, marginBottom: 4 },
});

function InterviewPrepPDF() {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Mapleins Interview Prep Guide"),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Before the Interview"),
        React.createElement(Text, { style: styles.text }, "• Research the company and role"),
        React.createElement(Text, { style: styles.text }, "• Prepare 3-5 STAR stories (Situation, Task, Action, Result)"),
        React.createElement(Text, { style: styles.text }, "• Dress professionally"),
        React.createElement(Text, { style: styles.text }, "• Bring copies of your resume")
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Common Canadian Interview Questions"),
        React.createElement(Text, { style: styles.text }, "• Tell me about yourself"),
        React.createElement(Text, { style: styles.text }, "• Why do you want to work here?"),
        React.createElement(Text, { style: styles.text }, "• What are your strengths and weaknesses?"),
        React.createElement(Text, { style: styles.text }, "• Where do you see yourself in 5 years?"),
        React.createElement(Text, { style: styles.text }, "• Do you have work authorization in Canada?")
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Tips for Success"),
        React.createElement(Text, { style: styles.text }, "• Arrive 10-15 minutes early"),
        React.createElement(Text, { style: styles.text }, "• Make eye contact and smile"),
        React.createElement(Text, { style: styles.text }, "• Ask 2-3 questions at the end"),
        React.createElement(Text, { style: styles.text }, "• Send a thank-you email within 24 hours")
      )
    )
  );
}

export async function GET() {
  const doc = InterviewPrepPDF();
  const stream = await renderToStream(doc);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Mapleins-Interview-Prep.pdf"',
    },
  });
}
