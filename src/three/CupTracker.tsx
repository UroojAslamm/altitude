import { Canvas } from '@react-three/fiber';
import { CupFallback } from '@/components/CupFallback';
import type { OrderStatus } from '@/lib/types';

interface Props { status: OrderStatus; accent: string; ahead: number }

/** Temporary until M6. Keeps the import and chunk boundary in place. */
export default function CupTracker({ status, accent }: Props) {
  void Canvas;
  return <CupFallback status={status} accent={accent} />;
}
