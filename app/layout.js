import './globals.css';

export const metadata = {
  title: 'Runelana — Build your legend',
  description: 'A fantasy idle strategy game. Choose your expedition, earn runes, and equip your legend.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
