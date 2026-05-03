// Dados sintéticos para Validação por Arquivo (VALIDAÇÃO-CSV-01).
const VALIDACAO_TIPOS = [
  { tipo: 'extrato_cc',       total: 142, pct: 0.94, d7: 'graduado'   },
  { tipo: 'fatura_cartao',    total:  86, pct: 0.78, d7: 'calibracao' },
  { tipo: 'recibo_medico',    total:  54, pct: 0.41, d7: 'regredindo' },
  { tipo: 'fatura_concessionaria', total: 38, pct: 0.92, d7: 'graduado'  },
  { tipo: 'cupom_fiscal',     total:  72, pct: 0.62, d7: 'calibracao' },
  { tipo: 'comprovante',      total:  29, pct: 0.86, d7: 'graduado'   },
  { tipo: 'nota_servico',     total:  18, pct: 0.55, d7: 'calibracao' },
];

// 30 pontos de sparkline por tipo (variação de cobertura nos últimos 30 dias)
function _spark(seed) { const a=[]; let v=seed; for (let i=0;i<30;i++){ v=Math.max(0.1,Math.min(1, v+(Math.random()-0.5)*0.08)); a.push(v); } return a; }
VALIDACAO_TIPOS.forEach(t => t.spark = _spark(t.pct));

const VALIDACAO_LINHAS = [
  { id: 1, sha8:'a3f9c1e2', filename:'extrato_nubank_cc_2026-03.pdf', tipo:'extrato_cc', data:'2026-03-15', campo:'saldo_final',
    valor_etl:'R$ 4.102,15', valor_opus:'R$ 4.102,15', valor_humano:'',
    status_opus:'ok', status_humano:'pendente', conf:0.98, obs:'' },
  { id: 2, sha8:'b7d2a04f', filename:'fatura_c6_cartao_2026-03.pdf', tipo:'fatura_cartao', data:'2026-03-22', campo:'total_fatura',
    valor_etl:'R$ 2.847,90', valor_opus:'R$ 2.874,90', valor_humano:'',
    status_opus:'divergente', status_humano:'pendente', conf:0.71, obs:'OCR confundiu "47" com "74" na 4a posição' },
  { id: 3, sha8:'b7d2a04f', filename:'fatura_c6_cartao_2026-03.pdf', tipo:'fatura_cartao', data:'2026-03-22', campo:'data_vencimento',
    valor_etl:'2026-04-08', valor_opus:'2026-04-08', valor_humano:'2026-04-08',
    status_opus:'ok', status_humano:'ok', conf:0.99, obs:'' },
  { id: 4, sha8:'c1e8b302', filename:'recibo_farmacia_drogasil.jpg', tipo:'recibo_medico', data:'2026-03-18', campo:'fornecedor',
    valor_etl:'DROGASIL S.A.', valor_opus:'Drogasil', valor_humano:'',
    status_opus:'divergente', status_humano:'revisar', conf:0.62, obs:'Padronização de razão social vs. nome fantasia' },
  { id: 5, sha8:'c1e8b302', filename:'recibo_farmacia_drogasil.jpg', tipo:'recibo_medico', data:'2026-03-18', campo:'valor_total',
    valor_etl:'R$ 87,40', valor_opus:'R$ 87,40', valor_humano:'',
    status_opus:'ok', status_humano:'pendente', conf:0.93, obs:'' },
  { id: 6, sha8:'b2e6f48d', filename:'energia_neoenergia_marco.pdf', tipo:'fatura_concessionaria', data:'2026-03-10', campo:'kwh_consumido',
    valor_etl:'318', valor_opus:'318', valor_humano:'318',
    status_opus:'ok', status_humano:'ok', conf:1.00, obs:'' },
  { id: 7, sha8:'e1f8c360', filename:'fatura_santander_cartao.xlsx', tipo:'fatura_cartao', data:'2026-03-25', campo:'total_fatura',
    valor_etl:'R$ 1.230,00', valor_opus:'R$ 1.250,00', valor_humano:'',
    status_opus:'divergente', status_humano:'pendente', conf:0.55, obs:'XLSX usou ponto como milhar, ETL leu como decimal' },
  { id: 8, sha8:'a8c4d91e', filename:'cupom_padaria.png',           tipo:'cupom_fiscal', data:'2026-03-12', campo:'valor_total',
    valor_etl:'(vazio)', valor_opus:'R$ 23,80', valor_humano:'',
    status_opus:'apenas_opus', status_humano:'pendente', conf:0.40, obs:'ETL não extraiu; OCR ruim em papel térmico' },
  { id: 9, sha8:'d4b6f192', filename:'nota_consulta_cardio.pdf',    tipo:'nota_servico', data:'2026-03-20', campo:'cnpj_prestador',
    valor_etl:'XX.XXX.XXX/XXXX-XX', valor_opus:'XX.XXX.XXX/XXXX-XX', valor_humano:'',
    status_opus:'ok', status_humano:'pendente', conf:0.96, obs:'' },
  { id:10, sha8:'f5a9d271', filename:'comprovante_aluguel_03.pdf',  tipo:'comprovante', data:'2026-03-05', campo:'valor_pago',
    valor_etl:'R$ 2.400,00', valor_opus:'R$ 2.400,00', valor_humano:'R$ 2.400,00',
    status_opus:'ok', status_humano:'ok', conf:1.00, obs:'' },
];

// JSON do diff (quando linha está selecionada — ID 2 por default).
const VALIDACAO_DIFF = {
  selectedId: 2,
  opus: {
    sha8: 'b7d2a04f',
    tipo_arquivo: 'fatura_cartao',
    extrator_referencia: 'opus_v1',
    campos: {
      total_fatura:    'R$ 2.874,90',
      data_emissao:    '2026-03-22',
      data_vencimento: '2026-04-08',
      bandeira:        'Mastercard',
      ultimos_4:       '••42',
      lancamentos:     18
    }
  },
  etl: {
    sha8: 'b7d2a04f',
    tipo_arquivo: 'fatura_cartao',
    extrator: 'c6_cartao',
    versao: '1.8.2',
    campos: {
      total_fatura:    'R$ 2.847,90',
      data_emissao:    '2026-03-22',
      data_vencimento: '2026-04-08',
      bandeira:        'Mastercard',
      ultimos_4:       '••42',
      lancamentos:     18
    }
  }
};
