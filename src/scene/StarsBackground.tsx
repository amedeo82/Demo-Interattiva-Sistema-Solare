/** Stelle di sfondo procedurali via drei <Stars>. */
import { Stars } from '@react-three/drei';
export function StarsBackground() {
  return <Stars radius={300} depth={60} count={6000} factor={4} saturation={0} fade speed={0.3} />;
}
