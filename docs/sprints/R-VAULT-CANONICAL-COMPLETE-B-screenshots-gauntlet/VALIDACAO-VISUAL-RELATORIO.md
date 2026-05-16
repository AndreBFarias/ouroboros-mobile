# Validação visual — R-VAULT-CANONICAL-COMPLETE-B

## Tentativa 1 — CLI X11 (scrot/import + xdotool)

Comando:
```
xdotool windowactivate 0x05e0000d
import -window 0x05e0000d /tmp/ouroboros_gauntlet_<ts>.png
```

Resultado: PNG capturado com sucesso (33651 bytes, sha256 d2be0eb9...).

**Bloqueio**: Janela do Gauntlet mostra "Welcome to Expo" (rota default do Expo Router) em vez do app real. Causa diagnostica: Metro rodando do **repo root** (PID 43990 expo start --web em /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros, NÃO no worktree), e SEM `EXPO_PUBLIC_GAUNTLET=1` (verificado em /proc/43990/environ).

A janela "Ouroboros - Google Chrome" (0x01a004b8) mostra o app em modo "onboarding" (versão do root, sem minhas mudanças no worktree).

## Tentativa 2 — claude-in-chrome MCP

Não tentado: tools claude-in-chrome MCP não estão disponíveis no escopo desta sessão.

## Tentativa 3 — playwright MCP (chromium standalone headless)

Comando:
```
chromium-1223/chrome --headless --no-sandbox --window-size=414,892 \
  --virtual-time-budget=60000 \
  --screenshot=/tmp/ouroboros_settings_pw_<ts>.png \
  http://localhost:8081/settings
```

Resultado: PNG capturado (32615 bytes, sha256 c8168a85...).

**Bloqueio**: Tela mostra "Como você se chama?" (onboarding) em vez de Settings. Causa: BiometriaGate/OnboardingGate redireciona para onboarding quando `__gauntlet` não está ativo. Sem `EXPO_PUBLIC_GAUNTLET=1` no Metro do root, não há bypass.

## Bloqueio de ambiente — solução proposta

Para validar visualmente esta sprint, é necessário re-bundle do Metro a partir do **worktree** com:

```bash
cd /home/andrefarias/Desenvolvimento/Protocolo-Mob-Ouroboros/.claude/worktrees/agent-ab721fa7f3886194a
lsof -ti:8081 | xargs -r kill -9   # mata Metro do root
EXPO_PUBLIC_GAUNTLET=1 ./run.sh --web
# Aguardar 30-60s primeira compilação
# Navegar para http://localhost:8081/_dev/gauntlet
# window.__gauntlet.abrir('/settings')
# Capturar PNG
```

NÃO executado nesta sessão para não impactar o Metro do usuário rodando.

## Compensação textual — diff no código

`app/settings/index.tsx`:
```tsx
// IMPORT NOVO (linha 38)
import { exportarEstadoCompletoZip } from '@/lib/vault/exportarEstadoCompleto';

// HANDLER NOVO (linha 402)
const exportarEstado = async () => {
  haptics.light();
  toast.show('Exportando estado…', 'info');
  const res = await exportarEstadoCompletoZip();
  if (!res.uri) {
    toast.show(res.motivo ?? 'Falha ao exportar estado.', 'error');
    return;
  }
  try {
    const disponivel = await Sharing.isAvailableAsync();
    if (disponivel) {
      await Sharing.shareAsync(res.uri, {
        mimeType: 'application/zip',
        dialogTitle: 'Compartilhar estado',
      });
      toast.show('Estado exportado.', 'success');
    } else {
      toast.show('Compartilhamento indisponível.', 'warn');
    }
  } catch {
    toast.show('Compartilhamento cancelado.', 'info');
  }
};

// BOTÃO NOVO (linha 506-512), inserido entre "Exportar todos os meus dados" e "Importar backup"
<Button
  label="Exportar estado completo"
  variant="ghost"
  onPress={exportarEstado}
  accessibilityLabel="exportar estado completo"
/>
```

## Cobertura compensatória

- 27 testes em `tests/lib/stats/calcular.test.ts` (calculador puro).
- 9 testes em `tests/lib/stats/escreverStats.test.ts` (writer + debounce).
- 7 testes em `tests/lib/vault/exportarEstadoCompleto.test.ts` (gera ZIP, _meta.md, filtra sync-conflict, edge cases).
- 1 E2E template em `tests/e2e/playwright/r-vault-b-settings-export.e2e.ts` (pronto para rodar quando Metro do worktree estiver ativo).

Total: 43 testes novos + E2E pronto.
