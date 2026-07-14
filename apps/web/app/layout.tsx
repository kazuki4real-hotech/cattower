import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";

import "./globals.css";

const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "cattower", template: "%s | cattower" },
  description: "猫との何気ない時間を、静かに収蔵する私室。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={rounded.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL@0..1&icon_names=add,arrow_back,arrow_forward,auto_awesome,check_circle,chevron_right,close,collections_bookmark,download,edit,expand_more,explore,family_restroom,home,image,lock,login,menu_book,notifications,palette,pets,photo_camera,photo_library,restaurant,search,settings,toys,upload,visibility&display=block"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
