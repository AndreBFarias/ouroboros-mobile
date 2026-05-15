// Cobre a prop opcional `maxLength` do Input (B5 da sprint AUDIT-T1-BUGS).
// Quando fornecida, o TextInput nativo recebe e limita a entrada. Quando
// omitida, a prop vem undefined (TextInput aceita ilimitado, comportamento
// padrao).
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

describe('Input maxLength', () => {
  it('repassa maxLength quando fornecido', () => {
    const { getByPlaceholderText } = render(
      <Input
        value=""
        onChangeText={() => undefined}
        placeholder="nome"
        maxLength={60}
      />
    );
    expect(getByPlaceholderText('nome').props.maxLength).toBe(60);
  });

  it('omite maxLength quando prop ausente (undefined)', () => {
    const { getByPlaceholderText } = render(
      <Input value="" onChangeText={() => undefined} placeholder="texto" />
    );
    expect(getByPlaceholderText('texto').props.maxLength).toBeUndefined();
  });
});
