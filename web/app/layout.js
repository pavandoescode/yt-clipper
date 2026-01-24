import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import PingWidget from "@/components/PingWidget";

export const metadata = {
  title: "YT Clipper",
  description: "Advanced YouTube Clipper Dashboard",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SidebarProvider>
            <PingWidget />
            {children}
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
