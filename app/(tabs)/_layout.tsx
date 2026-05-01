// Layout do grupo de rotas (tabs). M00.5 cria a fundacao com:
//   - 5 abas fixas (CONTRACT seção 1.1):
//       1. /(tabs)/           Hoje      (M02 - tela real)
//       2. /(tabs)/memoria    Memórias  (M11 - stub redirect)
//       3. /(tabs)/humor      Humor     (M10 - stub redirect)
//       4. /(tabs)/financas   Financas  (M14 - stub redirect)
//       5. /(tabs)/settings   Settings  (M15 - stub redirect)
//   - 5 abas condicionais (toggle on em useSettings.featureToggles):
//       /(tabs)/ciclo, /(tabs)/alarmes, /(tabs)/todo,
//       /(tabs)/contadores, /(tabs)/calendario
//
// Como as sprints donas (M10/M11/M14/M15 etc) ainda não rodaram,
// cada arquivo de rota correspondente (memoria.tsx, humor.tsx etc)
// renderiza <Redirect> para /(tabs)/em-construcao?sprint=MNN. Quando
// a sprint dona chegar, ela substitui o conteudo do arquivo pelo
// componente real.
//
// Abas condicionais com toggle off recebem `href: null` para o
// expo-router escondê-las da bottom bar; o arquivo de rota
// (ciclo.tsx etc) também renderiza <Redirect> até sua sprint dona.
import { Tabs } from 'expo-router';
import { BottomTabs } from '@/components/chrome/BottomTabs';
import { useSettings } from '@/lib/stores/settings';

export default function TabsLayout() {
  const featureToggles = useSettings((s) => s.featureToggles);

  return (
    <Tabs
      tabBar={(props) => <BottomTabs {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Aba fixa 1: Hoje (M02 já entregou app/(tabs)/index.tsx). */}
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />

      {/* Aba fixa 2: Memórias (stub redirect até M11). */}
      <Tabs.Screen name="memoria" options={{ title: 'Memorias' }} />

      {/* Aba fixa 3: Humor (stub redirect até M10). */}
      <Tabs.Screen name="humor" options={{ title: 'Humor' }} />

      {/* Aba fixa 4: Financas (stub redirect até M14). */}
      <Tabs.Screen name="financas" options={{ title: 'Financas' }} />

      {/* Aba fixa 5: Settings (stub redirect até M15). */}
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />

      {/* Stub generico sempre acessivel via deep link. Esconde da
          bottom bar via href:null para não virar 6a aba fixa. */}
      <Tabs.Screen
        name="em-construcao"
        options={{ href: null, title: 'Em construcao' }}
      />

      {/* Sub-rota exercícios (M13). E registrada como grupo via
          _layout interno; expoe-se aqui apenas para esconder da
          bottom bar (acesso fica pelo FAB radial e por deep link). */}
      <Tabs.Screen
        name="exercicios"
        options={{ href: null, title: 'Exercicios' }}
      />

      {/* Sub-rota medidas (M12). Mesmo padrao da sub-rota exercícios:
          stack interno (index = Tela 13, novo = Tela 12), sem aba
          fixa na bottom bar; acesso por deep link, FAB radial futuro
          ou navegacao a partir de Memórias / Settings. */}
      <Tabs.Screen
        name="medidas"
        options={{ href: null, title: 'Medidas' }}
      />

      {/* Abas condicionais: aparecem apenas quando o toggle esta on
          em Settings. Default off; CONTRACT seção 1.1 lista as 5. */}
      <Tabs.Screen
        name="ciclo"
        options={{
          title: 'Ciclo',
          href: featureToggles.cicloMenstrual ? '/(tabs)/ciclo' : null,
        }}
      />
      <Tabs.Screen
        name="alarmes"
        options={{
          title: 'Alarmes',
          href: featureToggles.alarmePessoal ? '/(tabs)/alarmes' : null,
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: 'Tarefas',
          href: featureToggles.todoLeve ? '/(tabs)/todo' : null,
        }}
      />
      <Tabs.Screen
        name="contadores"
        options={{
          title: 'Contadores',
          href: featureToggles.contadorDiasSem ? '/(tabs)/contadores' : null,
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Calendario',
          href: featureToggles.calendarioConquistas
            ? '/(tabs)/calendario'
            : null,
        }}
      />
    </Tabs>
  );
}
