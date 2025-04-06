import "./Attachments.css";
import "./Bubble.css";
import "./Lightbox.css";
import "./Prompt.css";
import "./Styles.css";

export const metadata = {
  title: "Messages",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
