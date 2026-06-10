import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { UIProvider } from "@/context/UIContext";

export const metadata = {
  title: "YT Clipper",
  description: "Advanced YouTube Clipper Dashboard",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <UIProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
