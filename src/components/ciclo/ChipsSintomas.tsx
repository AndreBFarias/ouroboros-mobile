// Wrapper sobre <ChipGroup mode="multi"> com a lista canonica de
// sintomas do ciclo (8 itens; M14.5 spec). Tom sobrio: sem accent
// negativo. Cada chip usa accent purple (cor primaria neutra) para
// nao patologizar. Caller passa value/onChange e o estado vivo no
// form do registro.
import { ChipGroup } from '@/components/ui';
import {
  SINTOMAS_CANONICOS,
  SINTOMAS_LABELS,
  type SintomaCiclo,
} from '@/lib/schemas/ciclo_menstrual';

export interface ChipsSintomasProps {
  value: SintomaCiclo[];
  onChange: (next: SintomaCiclo[]) => void;
  disabled?: boolean;
}

export function ChipsSintomas({
  value,
  onChange,
  disabled = false,
}: ChipsSintomasProps) {
  // Lista canonica em ordem fixa para estabilidade visual (testavel).
  const options = SINTOMAS_CANONICOS.map((s) => ({
    value: s,
    label: SINTOMAS_LABELS[s],
    accent: 'purple' as const,
  }));

  return (
    <ChipGroup
      mode="multi"
      value={value}
      onChange={(next) => onChange(next as SintomaCiclo[])}
      options={[...options]}
      disabled={disabled}
    />
  );
}
