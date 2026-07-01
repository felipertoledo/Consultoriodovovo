/* ============================================================
   clinical-data.js — Listas pré-prontas para autocomplete e chips
   Base: REMUME, antecedentes APS comuns, exame psíquico Dalgalarrondo
   ============================================================ */

const ClinicalData = (() => {

  // ============================================================
  // REMUME — base operacional (REMUME SJBV + Estiva Gerbi)
  // Formato: "nome dose apresentação"
  // ============================================================
  const REMUME = [
    // Hipertensão
    'Hidroclorotiazida 25mg', 'Captopril 25mg', 'Enalapril 5mg',
    'Enalapril 10mg', 'Enalapril 20mg', 'Losartana 50mg',
    'Anlodipino 5mg', 'Nifedipino retard 20mg', 'Atenolol 25mg',
    'Atenolol 50mg', 'Propranolol 40mg', 'Carvedilol 3,125mg',
    'Carvedilol 12,5mg', 'Metoprolol succinato 25mg', 'Metildopa 250mg',
    'Doxazosina 2mg', 'Furosemida 40mg', 'Espironolactona 25mg',
    'Espironolactona 100mg', 'Hidralazina 20mg/ml ampola',

    // Diabetes
    'Metformina 500mg', 'Metformina 850mg', 'Metformina XR 500mg',
    'Glibenclamida 5mg', 'Gliclazida MR 30mg',
    'Insulina NPH 100UI/ml', 'Insulina regular 100UI/ml',

    // Dislipidemia / antiagregação
    'Sinvastatina 20mg', 'Sinvastatina 40mg', 'AAS 100mg',
    'Varfarina 5mg',

    // ICC
    'Digoxina 0,25mg',

    // Asma / DPOC
    'Salbutamol aerossol 100mcg', 'Salbutamol nebulização 5mg/ml',
    'Ipratrópio nebulização 0,25mg/ml', 'Beclometasona 200mcg',
    'Beclometasona 250mcg', 'Budesonida 32mcg', 'Budesonida 50mcg',
    'Prednisona 5mg', 'Prednisona 20mg', 'Prednisolona solução oral',

    // Dor / analgesia
    'Dipirona 500mg', 'Dipirona solução oral',
    'Paracetamol 200mg/ml gotas',
    'Ibuprofeno 400mg', 'Ibuprofeno 600mg',
    'Diclofenaco 50mg', 'Nimesulida 100mg', 'Cetoprofeno 100mg',
    'Tramadol 50mg IM', 'Ciclobenzaprina 10mg',
    'Amitriptilina 25mg', 'Nortriptilina 25mg', 'Carbamazepina 200mg',

    // Saúde mental
    'Fluoxetina 20mg', 'Sertralina 50mg', 'Paroxetina 20mg',
    'Venlafaxina 75mg XR', 'Imipramina 25mg', 'Clomipramina 25mg',
    'Bupropiona 150mg',
    'Diazepam 10mg', 'Clonazepam 2mg', 'Nitrazepam 5mg',
    'Carbonato de lítio 300mg', 'Ácido valproico', 'Oxcarbazepina',
    'Haloperidol VO', 'Haloperidol IM', 'Haloperidol decanoato',
    'Clorpromazina 25mg', 'Clorpromazina 100mg',
    'Levomepromazina 25mg', 'Levomepromazina 100mg',
    'Biperideno 2mg',

    // Antiepilépticos
    'Fenitoína 100mg', 'Fenobarbital 100mg', 'Carbamazepina 400mg',

    // Tireoide
    'Levotiroxina 25mcg', 'Levotiroxina 50mcg', 'Levotiroxina 100mcg',

    // Osteoporose
    'Alendronato 70mg semanal', 'Carbonato de cálcio 500mg + vit D 400UI',

    // Antimicrobianos
    'Amoxicilina 500mg', 'Amoxicilina suspensão 250mg/5ml',
    'Amoxicilina + Clavulanato 500+125mg',
    'Penicilina benzatina 1.200.000 UI', 'Penicilina procaína + potássica',
    'Cefalexina 500mg', 'Cefalexina suspensão',
    'Ceftriaxona 500mg IM', 'Ceftriaxona 1g IM',
    'Azitromicina 500mg', 'Azitromicina suspensão',
    'Claritromicina 500mg',
    'Ciprofloxacino 500mg', 'Norfloxacino 400mg', 'Levofloxacino 500mg',
    'Doxiciclina 100mg',
    'Sulfametoxazol + Trimetoprima 800+160mg',
    'Metronidazol 250mg', 'Metronidazol gel vaginal',
    'Clindamicina 300mg', 'Nitrofurantoína 100mg',

    // Antifúngicos / antiparasitários
    'Nistatina creme', 'Miconazol creme vaginal',
    'Cetoconazol creme', 'Cetoconazol shampoo 2%',
    'Fluconazol 150mg', 'Cetoconazol 200mg',
    'Permetrina 1% loção', 'Permetrina 5% creme',
    'Ivermectina 6mg', 'Albendazol 400mg', 'Mebendazol 100mg',

    // Corticoides tópicos
    'Hidrocortisona 1% creme', 'Betametasona 0,1% creme',
    'Dexametasona creme',

    // Oftalmológicos
    'Cloranfenicol colírio 0,5%', 'Tobramicina colírio',

    // GI
    'Omeprazol 20mg', 'Hidróxido de alumínio suspensão',
    'Metoclopramida 10mg', 'Lactulose xarope',
    'Loperamida 2mg', 'Escopolamina',

    // Contracepção
    'Etinilestradiol 0,03mg + Levonorgestrel 0,15mg',
    'Noretisterona 0,35mg',
    'Medroxiprogesterona 150mg trimestral',
    'Estradiol + Algestona acetofenida mensal',
    'Levonorgestrel 1,5mg (contracepção de emergência)',

    // Gestação
    'Ácido fólico 5mg', 'Sulfato ferroso 40mg Fe elementar',

    // Vitaminas
    'Sulfato ferroso solução pediátrica', 'Vitamina A megadose',
    'Colecalciferol 7000UI semanal',

    // Comuns particulares/PFPB que aparecem muito
    'Atorvastatina 20mg', 'Atorvastatina 40mg', 'Rosuvastatina 10mg',
    'Rosuvastatina 20mg', 'Pantoprazol 40mg', 'Esomeprazol 40mg',
    'Pregabalina 75mg', 'Gabapentina 300mg', 'Gabapentina 600mg',
    'Risperidona 1mg', 'Risperidona 2mg', 'Quetiapina 25mg',
    'Quetiapina 100mg', 'Olanzapina 5mg', 'Olanzapina 10mg',
    'Topiramato 50mg', 'Levetiracetam 500mg', 'Lamotrigina 50mg',
    'Lamotrigina 100mg', 'Escitalopram 10mg', 'Escitalopram 20mg',
    'Trazodona 50mg', 'Trazodona 100mg', 'Mirtazapina 30mg',
    'Donepezila 5mg', 'Donepezila 10mg', 'Memantina 10mg',
    'Empagliflozina 25mg', 'Dapagliflozina 10mg', 'Liraglutida',
    'Semaglutida', 'Sitagliptina 100mg', 'Linagliptina 5mg',
    'Insulina glargina', 'Insulina lispro', 'Insulina aspart',
    'Tansulosina 0,4mg', 'Finasterida 5mg', 'Sildenafila 50mg',
    'Tadalafila 5mg', 'Cloridrato de oxibutinina 5mg',
    'Tiotrópio brometo 18mcg', 'Formoterol + Budesonida'
  ];

  // ============================================================
  // Antecedentes pessoais — chips pré-prontos APS
  // ============================================================
  const ANTECEDENTES_COMUNS = [
    'HAS', 'DM2', 'DM1', 'Dislipidemia', 'Obesidade',
    'Asma', 'DPOC', 'Tabagismo ativo', 'Ex-tabagismo',
    'Depressão', 'Ansiedade', 'Transtorno bipolar', 'Esquizofrenia',
    'Hipotireoidismo', 'Hipertireoidismo',
    'AVC prévio', 'AIT prévio', 'IAM prévio', 'Angina',
    'ICC', 'FA',
    'DRC', 'Litíase renal', 'ITU de repetição',
    'Neoplasia em remissão', 'Neoplasia em tratamento',
    'Doença de Parkinson', 'Demência',
    'Osteoporose', 'Osteoartrose',
    'Hepatite B', 'Hepatite C', 'HIV', 'Sífilis tratada',
    'Tuberculose tratada', 'Hanseníase tratada',
    'Refluxo gastroesofágico', 'Úlcera péptica',
    'Hérnia de disco', 'Lombalgia crônica',
    'Etilismo', 'Ex-etilismo',
    'Alergia medicamentosa', 'Alergia alimentar'
  ];

  // ============================================================
  // Cirurgias prévias comuns
  // ============================================================
  const CIRURGIAS_COMUNS = [
    'Apendicectomia', 'Colecistectomia', 'Histerectomia',
    'Cesariana', 'Laqueadura tubária', 'Vasectomia',
    'Herniorrafia inguinal', 'Herniorrafia umbilical',
    'RTU próstata', 'Prostatectomia',
    'Catarata', 'Cirurgia bariátrica',
    'Artroplastia de quadril', 'Artroplastia de joelho',
    'Tireoidectomia', 'Mastectomia'
  ];

  // ============================================================
  // Antecedentes familiares — chips
  // ============================================================
  const FAMILIARES_COMUNS = [
    'HAS na família', 'DM2 na família', 'Dislipidemia familiar',
    'Cardiopatia precoce (parente <55a homem / <65a mulher)',
    'AVC familiar', 'Neoplasia de mama', 'Neoplasia de próstata',
    'Neoplasia colorretal', 'Outras neoplasias',
    'Depressão familiar', 'Transtorno bipolar familiar',
    'Esquizofrenia familiar', 'Suicídio familiar',
    'Alcoolismo familiar', 'Demência familiar'
  ];

  // ============================================================
  // EXAME PSÍQUICO — Domínios Dalgalarrondo
  // Cada domínio: { id, nome, tooltip, tipo, opcoes, default }
  // tipo: 'single' | 'multi' | 'severity' (com modificador)
  // ============================================================

  const EXAME_PSIQUICO_COMPLETO = [
    {
      id: 'apresentacao',
      nome: '1. Apresentação',
      tooltip: 'Aspecto físico, vestimenta, higiene, postura e atitude global do paciente ao chegar à consulta.',
      tipo: 'multi',
      opcoes: [
        'Boa higiene', 'Higiene precária', 'Vestuário adequado',
        'Vestuário inadequado', 'Excêntrico', 'Cooperativo',
        'Pouco cooperativo', 'Hostil', 'Sedutor', 'Regredido',
        'Negligência pessoal', 'Aparência condizente com idade',
        'Aparência mais velha que a idade', 'Aparência mais jovem que a idade'
      ],
      sumarioDefault: 'apresenta-se com boa higiene corporal, vestuário adequado à situação, mostrando-se cooperativo durante a entrevista'
    },
    {
      id: 'consciencia',
      nome: '2. Consciência',
      tooltip: 'Grau de clareza/vigília. Em ordem crescente de comprometimento: vigil → sonolência → obnubilação → torpor → coma.',
      tipo: 'single',
      opcoes: ['Vigil', 'Sonolento', 'Obnubilado', 'Torporoso', 'Comatoso',
               'Hipervigil (estado de alerta aumentado)',
               'Estreitamento da consciência', 'Estado crepuscular'],
      sumarioDefault: 'vigil, consciência clara'
    },
    {
      id: 'atencao',
      nome: '3. Atenção',
      tooltip: 'Tenacidade = capacidade de manter foco. Vigilância = capacidade de captar novos estímulos. Hipoprosexia = redução. Hiperprosexia = aumento patológico.',
      tipo: 'multi',
      opcoes: ['Tenacidade preservada', 'Tenacidade reduzida (hipoprosexia)',
               'Tenacidade aumentada (hiperprosexia)',
               'Vigilância preservada', 'Distratibilidade aumentada',
               'Distraído', 'Concentrado'],
      sumarioDefault: 'atenção (tenacidade e vigilância) preservadas'
    },
    {
      id: 'orientacao',
      nome: '4. Orientação',
      tooltip: 'Autopsíquica = quanto a si mesmo (quem é, idade). Alopsíquica = quanto ao ambiente (tempo, espaço, pessoas).',
      tipo: 'multi',
      opcoes: ['Orientado autopsiquicamente', 'Desorientado autopsiquicamente',
               'Orientado alopsiquicamente no tempo', 'Desorientado no tempo',
               'Orientado alopsiquicamente no espaço', 'Desorientado no espaço',
               'Orientado quanto a pessoas', 'Desorientado quanto a pessoas'],
      sumarioDefault: 'orientado auto e alopsiquicamente em tempo, espaço e pessoa'
    },
    {
      id: 'memoria',
      nome: '5. Memória',
      tooltip: 'Imediata = segundos (repetir dígitos). Recente = minutos/horas (eventos do dia). Remota = anos (biografia).',
      tipo: 'multi',
      opcoes: ['Imediata preservada', 'Imediata comprometida',
               'Recente preservada', 'Recente comprometida',
               'Remota preservada', 'Remota comprometida',
               'Amnésia retrógrada', 'Amnésia anterógrada',
               'Hipermnésia', 'Paramnésia', 'Confabulação'],
      sumarioDefault: 'memória imediata, recente e remota preservadas'
    },
    {
      id: 'sensopercepcao',
      nome: '6. Sensopercepção',
      tooltip: 'Alucinação = percepção sem objeto (não há estímulo real). Ilusão = percepção distorcida de estímulo real. Pseudo-alucinação = paciente percebe como "interna".',
      tipo: 'multi',
      opcoes: ['Sem alterações', 'Alucinações auditivas',
               'Alucinações visuais', 'Alucinações táteis',
               'Alucinações olfativas', 'Alucinações gustativas',
               'Alucinações cenestésicas', 'Ilusões',
               'Pseudo-alucinações', 'Despersonalização', 'Desrealização'],
      sumarioDefault: 'sensopercepção sem alterações'
    },
    {
      id: 'pensamento_forma',
      nome: '7. Pensamento — forma',
      tooltip: 'Como o pensamento se estrutura. Lógico/coerente, fuga de ideias (mania), desagregação/incoerência (psicose), bloqueio, perseveração.',
      tipo: 'multi',
      opcoes: ['Lógico e coerente', 'Fuga de ideias',
               'Desagregação', 'Incoerência', 'Bloqueio do pensamento',
               'Perseveração', 'Roubo do pensamento',
               'Concretismo', 'Tangencial', 'Circunstancial'],
      sumarioDefault: 'pensamento de forma lógica e coerente'
    },
    {
      id: 'pensamento_curso',
      nome: '8. Pensamento — curso',
      tooltip: 'Velocidade. Acelerado (taquipsiquismo, mania), lentificado (bradipsiquismo, depressão), bloqueado.',
      tipo: 'single',
      opcoes: ['Curso normal', 'Acelerado (taquipsiquismo)',
               'Lentificado (bradipsiquismo)', 'Bloqueado',
               'Logorreico (verborrágico)', 'Lacônico'],
      sumarioDefault: 'curso do pensamento normal'
    },
    {
      id: 'pensamento_conteudo',
      nome: '9. Pensamento — conteúdo',
      tooltip: 'Sobre o que o pensamento versa. Delírios, obsessões, fobias, ideação suicida/homicida, ideias de ruína/culpa/desvalia.',
      tipo: 'multi',
      opcoes: ['Sem alterações',
               'Delírio persecutório', 'Delírio de grandeza',
               'Delírio místico', 'Delírio de referência',
               'Delírio de ciúme', 'Delírio somático',
               'Ideias obsessivas', 'Compulsões',
               'Fobias',
               'Ideação de desvalia', 'Ideias de ruína',
               'Ideação de culpa', 'Ideação de morte',
               'Ideação suicida passiva', 'Ideação suicida ativa',
               'Plano suicida estruturado',
               'Ideação homicida', 'Hipocondria'],
      sumarioDefault: 'conteúdo do pensamento sem alterações'
    },
    {
      id: 'linguagem',
      nome: '10. Linguagem',
      tooltip: 'Capacidade expressiva e compreensiva. Afasias, disartria, mutismo, neologismos (palavras inventadas em psicose).',
      tipo: 'multi',
      opcoes: ['Preservada', 'Disartria', 'Disfasia',
               'Afasia de expressão (Broca)', 'Afasia de compreensão (Wernicke)',
               'Mutismo', 'Neologismos', 'Ecolalia', 'Pararrespostas'],
      sumarioDefault: 'linguagem preservada, sem alterações'
    },
    {
      id: 'afeto',
      nome: '11. Afeto',
      tooltip: 'Tonalidade emocional observável momento a momento. Eutímico = neutro/equilibrado. Distinto de humor (estado emocional mais duradouro).',
      tipo: 'severity',
      opcoes: ['Eutímico', 'Deprimido', 'Exaltado/eufórico',
               'Ansioso', 'Lábil', 'Irritável',
               'Embotado', 'Inadequado', 'Apático'],
      sumarioDefault: 'afeto eutímico'
    },
    {
      id: 'humor',
      nome: '12. Humor',
      tooltip: 'Estado emocional basal e duradouro (dias/semanas). Diferente do afeto, que é a expressão momentânea.',
      tipo: 'severity',
      opcoes: ['Eutímico', 'Rebaixado', 'Expansivo',
               'Irritável', 'Disfórico', 'Misto'],
      sumarioDefault: 'humor eutímico'
    },
    {
      id: 'vontade',
      nome: '13. Vontade / Pragmatismo',
      tooltip: 'Capacidade de iniciar, executar e completar ações. Hipobulia (depressão), hiperbulia (mania), abulia (esquizofrenia/depressão grave).',
      tipo: 'single',
      opcoes: ['Pragmatismo preservado', 'Hipobulia',
               'Hiperbulia', 'Abulia', 'Procrastinação importante',
               'Impulsividade'],
      sumarioDefault: 'vontade e pragmatismo preservados'
    },
    {
      id: 'psicomotricidade',
      nome: '14. Psicomotricidade',
      tooltip: 'Atividade motora global. Agitação (ansiedade, mania), lentificação (depressão), catatonia (psicose grave), estereotipias.',
      tipo: 'multi',
      opcoes: ['Normal', 'Agitação psicomotora',
               'Lentificação psicomotora', 'Inquietação',
               'Catatonia', 'Estereotipias', 'Maneirismos',
               'Tiques', 'Tremor'],
      sumarioDefault: 'psicomotricidade normal'
    },
    {
      id: 'inteligencia',
      nome: '15. Inteligência (impressão clínica)',
      tooltip: 'Impressão geral do funcionamento intelectual baseada na entrevista. Não substitui avaliação neuropsicológica formal.',
      tipo: 'single',
      opcoes: ['Compatível com escolaridade', 'Acima da média esperada',
               'Aparente comprometimento leve', 'Aparente comprometimento moderado',
               'Aparente comprometimento grave', 'Suspeita de deficiência intelectual'],
      sumarioDefault: 'inteligência compatível com a escolaridade do paciente'
    },
    {
      id: 'insight',
      nome: '16. Insight / Crítica',
      tooltip: 'Capacidade do paciente de reconhecer que está doente e que precisa de tratamento. Central em quadros psicóticos e dependências.',
      tipo: 'single',
      opcoes: ['Insight preservado', 'Insight parcial',
               'Insight ausente', 'Crítica parcial sobre os sintomas',
               'Sem crítica sobre os sintomas',
               'Reconhece a doença mas nega a necessidade de tratamento'],
      sumarioDefault: 'insight e crítica preservados'
    },
    {
      id: 'juizo',
      nome: '17. Juízo de realidade',
      tooltip: 'Capacidade de distinguir o real do imaginário. Está prejudicado em psicoses, intoxicações graves, demências avançadas.',
      tipo: 'single',
      opcoes: ['Preservado', 'Parcialmente prejudicado', 'Prejudicado'],
      sumarioDefault: 'juízo de realidade preservado'
    },
    {
      id: 'comportamento',
      nome: '18. Comportamento durante a consulta',
      tooltip: 'Síntese da conduta global observada ao longo do encontro clínico. Útil para registrar incongruências entre o relato e a apresentação.',
      tipo: 'multi',
      opcoes: ['Adequado ao contexto', 'Colaborativo', 'Reservado',
               'Expansivo', 'Choro durante a entrevista',
               'Riso imotivado', 'Inquieto', 'Esquivo',
               'Agressivo verbalmente', 'Histriônico',
               'Sedutor', 'Querelante', 'Resistente à entrevista'],
      sumarioDefault: 'comportamento adequado ao contexto da consulta'
    }
  ];

  // Versão breve: 10 domínios consolidados para APS
  const EXAME_PSIQUICO_BREVE = [
    {
      id: 'apresentacao',
      nome: '1. Apresentação e cooperação',
      tooltip: 'Aspecto físico, vestimenta, higiene e atitude global durante a consulta.',
      tipo: 'multi',
      opcoes: ['Boa higiene', 'Higiene precária', 'Vestuário adequado',
               'Cooperativo', 'Pouco cooperativo', 'Hostil',
               'Aparência condizente com a idade'],
      sumarioDefault: 'apresenta-se com boa higiene, vestuário adequado e cooperativo'
    },
    {
      id: 'consciencia_orientacao',
      nome: '2. Consciência e orientação',
      tooltip: 'Vigília (vigil/sonolento/obnubilado) + orientação auto e alopsíquica em tempo, espaço e pessoa.',
      tipo: 'multi',
      opcoes: ['Vigil', 'Sonolento', 'Obnubilado',
               'Orientado em tempo', 'Desorientado em tempo',
               'Orientado em espaço', 'Desorientado em espaço',
               'Orientado em pessoa', 'Desorientado em pessoa'],
      sumarioDefault: 'vigil, orientado auto e alopsiquicamente'
    },
    {
      id: 'atencao',
      nome: '3. Atenção',
      tooltip: 'Capacidade de manter foco (tenacidade) e captar estímulos novos (vigilância).',
      tipo: 'single',
      opcoes: ['Preservada', 'Hipoprosexia', 'Hiperprosexia',
               'Distrátil', 'Concentrado'],
      sumarioDefault: 'atenção preservada'
    },
    {
      id: 'memoria',
      nome: '4. Memória (impressão geral)',
      tooltip: 'Avaliação ampla de memória imediata, recente e remota — sem detalhamento.',
      tipo: 'single',
      opcoes: ['Preservada nas três esferas', 'Comprometimento de memória recente',
               'Comprometimento de memória remota', 'Comprometimento global',
               'A esclarecer'],
      sumarioDefault: 'memória preservada nas três esferas'
    },
    {
      id: 'afeto_humor',
      nome: '5. Afeto e humor',
      tooltip: 'Afeto = expressão emocional momentânea. Humor = estado emocional duradouro.',
      tipo: 'multi',
      opcoes: ['Eutímico', 'Deprimido', 'Exaltado',
               'Ansioso', 'Irritável', 'Lábil', 'Embotado', 'Apático'],
      sumarioDefault: 'afeto e humor eutímicos'
    },
    {
      id: 'pensamento',
      nome: '6. Pensamento (forma, curso e conteúdo)',
      tooltip: 'Visão integrada da estrutura, velocidade e conteúdo do pensamento.',
      tipo: 'multi',
      opcoes: ['Lógico, coerente, curso e conteúdo normais',
               'Fuga de ideias', 'Desagregação',
               'Acelerado', 'Lentificado', 'Bloqueado',
               'Delírios', 'Ideação obsessiva',
               'Ideação de desvalia', 'Ideação de morte',
               'Ideação suicida passiva', 'Ideação suicida ativa',
               'Plano suicida estruturado'],
      sumarioDefault: 'pensamento de forma lógica, curso e conteúdo sem alterações'
    },
    {
      id: 'sensopercepcao',
      nome: '7. Sensopercepção',
      tooltip: 'Presença ou ausência de alucinações (auditivas, visuais, etc.) e ilusões.',
      tipo: 'multi',
      opcoes: ['Sem alterações', 'Alucinações auditivas',
               'Alucinações visuais', 'Alucinações táteis',
               'Ilusões', 'Despersonalização', 'Desrealização'],
      sumarioDefault: 'sensopercepção sem alterações'
    },
    {
      id: 'psicomotricidade',
      nome: '8. Psicomotricidade',
      tooltip: 'Atividade motora — pode estar normal, agitada, lentificada ou alterada por tiques/estereotipias.',
      tipo: 'single',
      opcoes: ['Normal', 'Agitação', 'Lentificação',
               'Inquietação', 'Catatonia'],
      sumarioDefault: 'psicomotricidade normal'
    },
    {
      id: 'insight',
      nome: '9. Insight / Crítica',
      tooltip: 'Capacidade do paciente de reconhecer a doença e a necessidade de tratamento.',
      tipo: 'single',
      opcoes: ['Preservado', 'Parcial', 'Ausente'],
      sumarioDefault: 'insight e crítica preservados'
    },
    {
      id: 'comportamento',
      nome: '10. Comportamento na consulta',
      tooltip: 'Síntese global da conduta observada durante a entrevista clínica.',
      tipo: 'multi',
      opcoes: ['Adequado', 'Colaborativo', 'Reservado',
               'Choro', 'Inquieto', 'Esquivo', 'Agressivo'],
      sumarioDefault: 'comportamento adequado ao contexto da consulta'
    }
  ];

  // ============================================================
  // Busca com autocomplete (substring case-insensitive)
  // ============================================================
  function searchMedicamentos(query, limit = 8) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    return REMUME.filter(m => m.toLowerCase().includes(q)).slice(0, limit);
  }

  return {
    REMUME,
    ANTECEDENTES_COMUNS,
    CIRURGIAS_COMUNS,
    FAMILIARES_COMUNS,
    EXAME_PSIQUICO_COMPLETO,
    EXAME_PSIQUICO_BREVE,
    searchMedicamentos
  };
})();

window.ClinicalData = ClinicalData;
if (typeof module !== 'undefined' && module.exports) module.exports = window.ClinicalData;
