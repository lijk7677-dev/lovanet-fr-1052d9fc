export type NavStyle = {
  id: string;
  name: string;
  cardOverlay: string; // rgba or gradient
  textColor: string;
  accent: string;
  fontFamily: string;
};

// Generate 50 curated style presets for advanced visitor personalization.
const baseFonts = [
  "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  "Poppins, Inter, system-ui, sans-serif",
  "DM Sans, Inter, system-ui, sans-serif",
  "Montserrat, Inter, system-ui, sans-serif",
  "Roboto, Inter, system-ui, sans-serif",
  "Playfair Display, Georgia, serif",
  "Merriweather, Georgia, serif",
  "Source Sans 3, Inter, system-ui, sans-serif",
  "Noto Sans, Inter, system-ui, sans-serif",
  "Cabin, Inter, system-ui, sans-serif",
];

const palettes = [
  ["rgba(0,0,0,0.45)", "#FFFFFF", "#7DD3FC"],
  ["rgba(2,6,23,0.6)", "#F8FAFC", "#60A5FA"],
  ["rgba(10,10,10,0.35)", "#FFFFFF", "#F472B6"],
  ["linear-gradient(135deg, rgba(13,148,136,0.18), rgba(59,130,246,0.12))", "#F8FAFC", "#34D399"],
  ["rgba(8,6,23,0.5)", "#FEF3C7", "#F59E0B"],
  ["rgba(3,7,18,0.45)", "#F0F9FF", "#60A5FA"],
  ["rgba(20,20,20,0.5)", "#FFF7ED", "#FB923C"],
  ["linear-gradient(90deg, rgba(99,102,241,0.12), rgba(236,72,153,0.08))", "#FFFFFF", "#9F7AEA"],
  ["rgba(6,11,14,0.5)", "#ECFDF5", "#34D399"],
  ["rgba(5,8,20,0.6)", "#FFF1F2", "#F43F5E"],
];

const styles: NavStyle[] = [];
for (let i = 0; i < 50; i++) {
  const p = palettes[i % palettes.length];
  const f = baseFonts[i % baseFonts.length];
  styles.push({
    id: `preset-${i + 1}`,
    name: `Style ${i + 1}`,
    cardOverlay: p[0],
    textColor: p[1],
    accent: p[2],
    fontFamily: f,
  });
}

export default styles;
