const H = require('./helpers');
const RC = require('../modules/resumo-clinico.js');

H.section('ResumoClinico.tendencia');
H.test('PA compara a sistólica', () => {
  H.assertEq(RC.tendencia('pa', '148/92', '138/86'), 'up');
  H.assertEq(RC.tendencia('pa', '120x80', '130x80'), 'down');
  H.assertEq(RC.tendencia('pa', '130/80', '130/85'), 'flat');
});
H.test('numéricos com vírgula e sem base → null', () => {
  H.assertEq(RC.tendencia('peso', '82,4', '83,9'), 'down');
  H.assertEq(RC.tendencia('glicemiaCapilar', '142', ''), null);
  H.assertEq(RC.tendencia('fc', 'abc', '70'), null);
});

H.section('ResumoClinico.derivar');
const consultas = [
  { id: 3, dataHora: '2026-08-12T10:00:00Z', queixaPrincipal: 'Retorno HAS/DM',
    antecedentes: ['HAS', 'DM2', 'Alergia medicamentosa'], alergias: 'Penicilina — anafilaxia',
    cirurgias: ['Colecistectomia'], familiares: ['DM2 na família'], medicacoesUso: ['Losartana 50 mg', 'Metformina 850 mg'],
    tabagismo: 'ex', pa: '148/92', peso: '82,4', glicemiaCapilar: '142' },
  { id: 2, dataHora: '2026-06-10T10:00:00Z', queixaPrincipal: 'Dor no joelho', antecedentes: ['HAS'], medicacoesUso: [] }, // sem vitais
  { id: 1, dataHora: '2026-04-02T10:00:00Z', antecedentes: [], pa: '138/86', peso: '83,9', glicemiaCapilar: '118' }
];
const r = RC.derivar(consultas);
H.test('total, última consulta e queixa', () => {
  H.assertEq(r.total, 3); H.assertEq(r.ultima.id, 3); H.assertEq(r.ultima.queixa, 'Retorno HAS/DM');
});
H.test('alergias vêm do campo dedicado; chip de alergia sai dos problemas', () => {
  H.assertEq(r.alergias, 'Penicilina — anafilaxia');
  H.assertEq(r.alergiaSemDetalhe, false);
  H.assert(r.problemas.includes('HAS') && r.problemas.includes('DM2') && !r.problemas.some(p => /alergia/i.test(p)), 'problemas errados');
});
H.test('vitais: pega a última consulta COM vitais e compara com a anterior com vitais (pula a sem)', () => {
  H.assertEq(r.vitais.data, '2026-08-12T10:00:00Z');
  H.assertEq(r.vitais.anteriorData, '2026-04-02T10:00:00Z');
  const pa = r.vitais.itens.find(i => i.campo === 'pa');
  H.assertEq(pa.valor, '148/92'); H.assertEq(pa.anterior, '138/86'); H.assertEq(pa.tendencia, 'up');
  const peso = r.vitais.itens.find(i => i.campo === 'peso');
  H.assertEq(peso.tendencia, 'down');
});
H.test('chip de alergia sem detalhe → alergiaSemDetalhe', () => {
  const r2 = RC.derivar([{ id: 9, antecedentes: ['Alergia alimentar'] }]);
  H.assertEq(r2.alergias, ''); H.assertEq(r2.alergiaSemDetalhe, true);
});
H.test('sem consultas → resumo vazio e seguro', () => {
  const r0 = RC.derivar([]);
  H.assertEq(r0.total, 0); H.assertEq(r0.ultima, null); H.assertEq(r0.vitais, null); H.assertEq(r0.medicacoes.length, 0);
});

H.run();
