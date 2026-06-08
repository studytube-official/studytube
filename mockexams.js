// 模試出題範囲データ
// ※ 公式公開データは「source: 'official'」、推定は「source: 'estimate'」

const MOCK_EXAMS = [

  // ===== 河合塾 全統共通テスト模試 =====
  {
    id: "zento_mark1",
    name: "全統共通テスト模試 第1回",
    provider: "河合塾",
    timing: "6月頃",
    source: "official",
    note: "各科目の前半〜中盤まで",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_listening"], excludeTopics: [] },
      math:        {
        units: ["math1","mathA","math2","mathB","mathC"],
        excludeTopics: ["数学と人間の活動（数学A）", "複素数平面", "数学的な表現の工夫"]
      },
      physics:     { units: ["phy_mechanics","phy_wave"], excludeTopics: ["電磁誘導・交流","原子・原子核"] },
      chemistry:   { units: ["chem_theory1"], excludeTopics: ["天然・合成高分子","有機化学"] },
      biology:     { units: ["bio_cell","bio_genetics"], excludeTopics: ["生態・進化"] },
      science_basic: { units: ["phybasic","chembasic","biobasic","earthbasic"], excludeTopics: [] },
      geography:   { units: ["geo_sogo","geo_natural","geo_human"], excludeTopics: [] },
      japan_history: { units: ["jph_sogo","jph_ancient","jph_medieval","jph_early_modern"], excludeTopics: ["幕末","明治維新後"] },
      world_history: { units: ["wh_sogo","wh_ancient","wh_medieval","wh_early_modern"], excludeTopics: [] },
      civics:      { units: ["civ_public","civ_politics","civ_economy"], excludeTopics: [] },
      joho:        { units: ["joho_society","joho_design","joho_program","joho_network"], excludeTopics: [] },
    }
  },

  {
    id: "zento_mark2",
    name: "全統共通テスト模試 第2回",
    provider: "河合塾",
    timing: "7〜8月頃",
    source: "official",
    note: "夏前〜夏の実力確認",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_listening","eng_writing","eng_vocab"], excludeTopics: [] },
      math:        {
        units: ["math1","mathA","math2","mathB","mathC"],
        excludeTopics: ["数学と人間の活動（数学A）"]
      },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em","phy_thermo"], excludeTopics: ["電磁誘導・交流","原子・原子核"] },
      chemistry:   { units: ["chem_theory1","chem_theory2","chem_inorg"], excludeTopics: ["天然・合成高分子"] },
      biology:     { units: ["bio_cell","bio_body","bio_genetics"], excludeTopics: ["生態・進化"] },
      science_basic: { units: ["phybasic","chembasic","biobasic","earthbasic"], excludeTopics: [] },
      geography:   { units: ["geo_sogo","geo_natural","geo_human","geo_region"], excludeTopics: [] },
      japan_history: { units: ["jph_sogo","jph_ancient","jph_medieval","jph_early_modern"], excludeTopics: ["太平洋戦争・敗戦","占領・高度経済成長","冷戦終結後〜現代"] },
      world_history: { units: ["wh_sogo","wh_ancient","wh_medieval","wh_early_modern","wh_modern"], excludeTopics: ["ファシズム・第二次世界大戦","冷戦・脱植民地化","現代の国際秩序"] },
      civics:      { units: ["civ_public","civ_ethics","civ_politics","civ_economy"], excludeTopics: [] },
      joho:        { units: ["joho_society","joho_design","joho_program","joho_network"], excludeTopics: [] },
    }
  },

  {
    id: "zento_mark3",
    name: "全統共通テスト模試 第3回",
    provider: "河合塾",
    timing: "10〜11月頃",
    source: "official",
    note: "ほぼ全範囲・直前模試",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_listening","eng_writing","eng_vocab"], excludeTopics: [] },
      math:        {
        units: ["math1","mathA","math2","mathB","mathC"],
        excludeTopics: ["数学B：数学と社会生活", "数学C：数学的な表現の工夫"]
      },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em","phy_thermo","phy_atom"], excludeTopics: [] },
      chemistry:   { units: ["chem_theory1","chem_theory2","chem_inorg","chem_org"], excludeTopics: [] },
      biology:     { units: ["bio_cell","bio_body","bio_genetics","bio_ecology"], excludeTopics: [] },
      earth_science: { units: ["earth_solid","earth_history","earth_atmo","earth_astro"], excludeTopics: [] },
      science_basic: { units: ["phybasic","chembasic","biobasic","earthbasic"], excludeTopics: [] },
      geography:   { units: ["geo_sogo","geo_natural","geo_human","geo_region"], excludeTopics: [] },
      japan_history: { units: ["jph_sogo","jph_ancient","jph_medieval","jph_early_modern","jph_modern","jph_contemporary"], excludeTopics: [] },
      world_history: { units: ["wh_sogo","wh_ancient","wh_medieval","wh_early_modern","wh_modern","wh_contemporary"], excludeTopics: [] },
      civics:      { units: ["civ_public","civ_ethics","civ_politics","civ_economy"], excludeTopics: [] },
      joho:        { units: ["joho_society","joho_design","joho_program","joho_network"], excludeTopics: [] },
    }
  },

  // ===== 河合塾 全統記述模試 =====
  {
    id: "zento_kijutsu1",
    name: "全統記述模試 第1回",
    provider: "河合塾",
    timing: "5〜6月頃",
    source: "official",
    note: "記述式・国公立2次対策",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_writing","eng_vocab"], excludeTopics: [] },
      math:        {
        units: ["math1","mathA","math2","mathB","mathC"],
        excludeTopics: ["複素数平面","数学的な表現の工夫","積分法の応用"]
      },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em"], excludeTopics: ["電磁誘導・交流","原子・原子核"] },
      chemistry:   { units: ["chem_theory1","chem_theory2"], excludeTopics: ["有機化学","天然・合成高分子"] },
      biology:     { units: ["bio_cell","bio_body"], excludeTopics: ["生態・進化"] },
    }
  },

  {
    id: "zento_kijutsu2",
    name: "全統記述模試 第2回",
    provider: "河合塾",
    timing: "8月頃",
    source: "official",
    note: "夏期講習後の実力確認",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_writing","eng_vocab"], excludeTopics: [] },
      math:        {
        units: ["math1","mathA","math2","mathB","mathC"],
        excludeTopics: ["数学B：確率分布と統計的推測"]
      },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em","phy_thermo"], excludeTopics: ["原子・原子核"] },
      chemistry:   { units: ["chem_theory1","chem_theory2","chem_inorg"], excludeTopics: ["天然・合成高分子"] },
      biology:     { units: ["bio_cell","bio_body","bio_genetics"], excludeTopics: [] },
    }
  },

  {
    id: "zento_kijutsu3",
    name: "全統記述模試 第3回",
    provider: "河合塾",
    timing: "11月頃",
    source: "official",
    note: "直前・全範囲記述",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_writing","eng_vocab","eng_listening"], excludeTopics: [] },
      math:        {
        units: ["math1","mathA","math2","mathB","mathC"],
        excludeTopics: ["数学B：確率分布と統計的推測","平面上の曲線（2次曲線・媒介変数）"]
      },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em","phy_thermo","phy_atom"], excludeTopics: [] },
      chemistry:   { units: ["chem_theory1","chem_theory2","chem_inorg","chem_org"], excludeTopics: [] },
      biology:     { units: ["bio_cell","bio_body","bio_genetics","bio_ecology"], excludeTopics: [] },
    }
  },

  // ===== 進研模試（推定） =====
  {
    id: "shinken1",
    name: "進研模試 第1回（6月）",
    provider: "ベネッセ",
    timing: "6月頃",
    source: "estimate",
    note: "※範囲非公開。学校配布の範囲表を確認してください",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_listening"], excludeTopics: [] },
      math:        { units: ["math1","mathA","math2"], excludeTopics: ["微分法","積分法","数学B","数学C"] },
      science_basic: { units: ["phybasic","chembasic","biobasic","earthbasic"], excludeTopics: [] },
      japan_history: { units: ["jph_ancient","jph_medieval"], excludeTopics: [] },
      world_history: { units: ["wh_ancient","wh_medieval"], excludeTopics: [] },
    }
  },

  {
    id: "shinken2",
    name: "進研模試 第2回（10月）",
    provider: "ベネッセ",
    timing: "10月頃",
    source: "estimate",
    note: "※範囲非公開。学校配布の範囲表を確認してください",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_listening","eng_writing","eng_vocab"], excludeTopics: [] },
      math:        { units: ["math1","mathA","math2","mathB","mathC"], excludeTopics: ["複素数平面"] },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em"], excludeTopics: ["原子・原子核"] },
      chemistry:   { units: ["chem_theory1","chem_theory2","chem_inorg"], excludeTopics: ["天然・合成高分子"] },
      biology:     { units: ["bio_cell","bio_body","bio_genetics"], excludeTopics: [] },
      science_basic: { units: ["phybasic","chembasic","biobasic","earthbasic"], excludeTopics: [] },
      japan_history: { units: ["jph_ancient","jph_medieval","jph_early_modern","jph_modern"], excludeTopics: [] },
      world_history: { units: ["wh_ancient","wh_medieval","wh_early_modern","wh_modern"], excludeTopics: [] },
    }
  },

  // ===== 駿台模試（推定） =====
  {
    id: "sundai1",
    name: "駿台全国模試 第1回",
    provider: "駿台",
    timing: "5〜6月頃",
    source: "estimate",
    note: "※範囲非公開。難関大向け・ハイレベル",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_writing","eng_vocab"], excludeTopics: [] },
      math:        { units: ["math1","mathA","math2","mathB","mathC"], excludeTopics: ["複素数平面","数学的な表現の工夫"] },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em"], excludeTopics: ["原子・原子核"] },
      chemistry:   { units: ["chem_theory1","chem_theory2"], excludeTopics: ["有機化学"] },
    }
  },

  {
    id: "sundai2",
    name: "駿台全国模試 第2回",
    provider: "駿台",
    timing: "10〜11月頃",
    source: "estimate",
    note: "※範囲非公開。難関大向け・ほぼ全範囲",
    ranges: {
      japanese:    { units: ["jpn_modern","jpn_classic","jpn_chinese"], excludeTopics: [] },
      english:     { units: ["eng_grammar","eng_reading","eng_writing","eng_vocab","eng_listening"], excludeTopics: [] },
      math:        { units: ["math1","mathA","math2","mathB","mathC"], excludeTopics: [] },
      physics:     { units: ["phy_mechanics","phy_wave","phy_em","phy_thermo","phy_atom"], excludeTopics: [] },
      chemistry:   { units: ["chem_theory1","chem_theory2","chem_inorg","chem_org"], excludeTopics: [] },
      biology:     { units: ["bio_cell","bio_body","bio_genetics","bio_ecology"], excludeTopics: [] },
    }
  },

];
