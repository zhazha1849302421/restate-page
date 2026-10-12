/**
 * data.js — ALL numbers, tables and case texts shown on the ReState project page.
 * ---------------------------------------------------------------------------
 * Source of truth: LaTeX source  iclr2027_conference.tex  (+ figures/*.pdf).
 * Each constant lists the table / figure it comes from, so you can re-check it
 * whenever the paper changes.
 *
 *   MAIN          Fig.1 bottom = Tab.1/2/3 fine-tuning rows, "Avg"/"Total" column
 *   DOMAIN        Tab.1        VersaCoT-10K per-domain accuracy
 *   ITER          Fig.4 (figures/figs-05.pdf) rounds 0-9
 *   BOARD         Tab.8 (appendix, full VersaCoT-10K table) "Avg" column
 *   ABLATION      Tab.4 (VersaCoT) / Tab.5 (M3CoT) / Tab.6 (ScienceQA)
 *   STATE_ABL     Tab.7        remove one reasoning-state type (VersaCoT-10K)
 *   COT_QUALITY   Tab.12/13/14 judge-based CoT quality (Qwen3.8-27B judge, 0-10)
 *   GEN           Tab.11       train on VersaCoT-10K -> test on ScienceQA / M3CoT
 *   OPTIONS       Fig.7 (figures/figs-04.pdf) right panel
 *   DOMAINS       App. B       8 domains, source benchmarks, 1,250 each
 *   CASES         Fig.14/15/16 iterative reasoning-state refinement examples
 *   COMPARE       Fig.8-13     qualitative comparison with baselines
 *
 * Markup allowed inside CASES[].rounds[].cot strings:
 *   <e>...</e>  erroneous reasoning            -> red
 *   <f>...</f>  corrected / preserved evidence -> green
 *   <w>...</w>  reasoning-answer inconsistency -> amber
 *
 * HOW TO EDIT: change values here only; main.js re-renders every chart / table.
 * Arrays indexed by backbone always follow the BACKBONES order.
 */

const BACKBONES = ['Qwen2.5-VL-7B', 'Qwen3-VL-8B', 'Qwen3.5-9B'];
const METHODS = ['Direct SFT', 'Multimodal-CoT', 'MIND', 'ReState (ours)'];

/* [backbone][method], method order = METHODS */
const MAIN = {
  versacot:  [[75.15, 72.65, 75.75, 77.05], [75.65, 76.50, 78.35, 79.25], [77.80, 77.30, 80.20, 81.90]],
  scienceqa: [[96.11, 95.68, 96.60, 97.43], [96.89, 96.53, 97.17, 98.16], [95.59, 95.50, 96.53, 98.37]],
  m3cot:     [[79.42, 76.32, 84.81, 84.99], [81.62, 78.95, 87.45, 87.96], [84.73, 75.93, 88.09, 89.00]],
};

const DOMAIN_COLS = ['MED', 'DRIVE', 'COMMON', 'DIAG', 'SPAT', 'GEO', 'CHART', 'MULTI', 'Avg'];
const DOMAIN = [
  { // Qwen2.5-VL-7B
    'Zero-shot':      [48.00, 52.00, 88.80, 72.40, 76.80, 70.40, 82.40, 48.80, 67.45],
    'Direct SFT':     [61.20, 65.60, 90.00, 83.20, 88.40, 72.40, 91.20, 49.20, 75.15],
    'Multimodal-CoT': [49.20, 62.00, 83.60, 82.40, 81.20, 73.20, 92.40, 57.20, 72.65],
    'MIND':           [55.20, 66.00, 88.80, 85.20, 85.60, 74.00, 94.80, 56.40, 75.75],
    'ReState (ours)': [57.20, 68.00, 88.40, 87.60, 89.60, 76.80, 94.00, 54.80, 77.05],
  },
  { // Qwen3-VL-8B
    'Zero-shot':      [51.60, 57.20, 88.80, 79.20, 89.20, 68.80, 83.60, 54.00, 71.55],
    'Direct SFT':     [59.20, 60.80, 88.40, 87.60, 90.40, 76.00, 90.80, 52.00, 75.65],
    'Multimodal-CoT': [50.00, 66.00, 83.20, 82.00, 90.80, 83.20, 95.60, 61.20, 76.50],
    'MIND':           [54.80, 67.60, 90.80, 84.80, 90.00, 83.60, 94.40, 60.80, 78.35],
    'ReState (ours)': [58.80, 69.20, 87.20, 89.60, 91.60, 82.80, 94.40, 60.40, 79.25],
  },
  { // Qwen3.5-9B
    'Zero-shot':      [61.60, 59.60, 87.60, 81.20, 83.60, 70.80, 84.80, 54.00, 72.90],
    'Direct SFT':     [61.20, 70.00, 86.80, 90.00, 90.00, 74.00, 94.40, 56.00, 77.80],
    'Multimodal-CoT': [56.40, 63.60, 83.60, 87.20, 88.00, 88.80, 94.00, 56.80, 77.30],
    'MIND':           [63.20, 68.80, 86.40, 91.60, 90.80, 84.00, 96.00, 60.80, 80.20],
    'ReState (ours)': [66.40, 76.00, 89.20, 91.20, 92.00, 83.60, 95.20, 61.60, 81.90],
  },
];

/* [backbone][round 0..9] */
const ITER = {
  versacot: [
    [75.10, 76.20, 76.70, 76.90, 77.05, 76.90, 77.00, 76.85, 77.00, 76.85],
    [77.25, 78.50, 78.90, 79.10, 79.00, 79.15, 79.25, 78.80, 78.85, 79.00],
    [78.45, 81.10, 81.50, 81.80, 81.65, 81.90, 81.70, 81.85, 81.60, 81.85],
  ],
  scienceqa: [
    [97.34, 97.38, 97.38, 97.41, 97.43, 97.43, 97.43, 97.43, 97.43, 97.41],
    [98.00, 98.07, 98.09, 98.09, 98.14, 98.14, 98.14, 98.14, 98.14, 98.16],
    [97.83, 98.37, 98.35, 98.37, 98.35, 98.37, 98.35, 98.37, 98.35, 98.37],
  ],
  m3cot: [
    [81.28, 84.17, 84.64, 84.34, 84.77, 84.25, 84.99, 84.38, 84.86, 84.34],
    [83.05, 86.67, 87.23, 87.58, 87.88, 87.62, 87.88, 87.66, 87.92, 87.96],
    [86.84, 88.83, 88.96, 89.00, 88.96, 88.91, 88.96, 88.96, 88.91, 88.96],
  ],
};

/* [label, avg, kind]  kind: 'human' | 'closed' | 'open' | 'ft' | 'ours'
   A selection from Tab.8; add / remove rows freely (chart keeps this order). */
const BOARD = [
  ['Human', 87.65, 'human'],
  ['Grok-4.6', 86.85, 'closed'],
  ['Kimi-K3 (2.8T)', 85.65, 'open'],
  ['Qwen3.8-Max', 85.35, 'closed'],
  ['Seed-2.1-Pro', 85.20, 'closed'],
  ['Claude Opus 5', 84.70, 'closed'],
  ['GPT-5.6-Sol', 83.00, 'closed'],
  ['Qwen3.5-9B + ReState', 81.90, 'ours'],
  ['Qwen3.5-397B-A17B', 81.60, 'open'],
  ['Qwen3-VL-235B-A22B', 80.65, 'open'],
  ['Qwen3.5-9B + MIND', 80.20, 'ft'],
  ['Qwen3.5-122B-A10B', 80.00, 'open'],
  ['Qwen3.6-27B', 79.55, 'open'],
  ['Qwen3-VL-8B + ReState', 79.25, 'ours'],
  ['Claude Sonnet 5', 79.15, 'closed'],
  ['Qwen2.5-VL-7B + ReState', 77.05, 'ours'],
  ['GLM-4.6V (106B)', 76.90, 'open'],
  ['MiniMax-M3 (428B)', 74.25, 'open'],
  ['Kimi-K2.6 (1T)', 74.10, 'open'],
  ['Qwen3.5-9B (zero-shot)', 72.90, 'open'],
];

/* rows: [name, URSM, SHS, ISR, [b0, b1, b2]] */
const ABLATION = {
  versacot: [
    ['Baseline (Direct SFT)', 0, 0, 0, [75.15, 75.65, 77.80]],
    ['+ URSM',                1, 0, 0, [75.65, 78.20, 78.95]],
    ['+ URSM + SHS',          1, 1, 0, [76.20, 78.50, 81.10]],
    ['+ URSM + ISR',          1, 0, 1, [76.20, 78.65, 79.45]],
    ['ReState (full)',        1, 1, 1, [77.05, 79.25, 81.90]],
  ],
  m3cot: [
    ['Baseline (Direct SFT)', 0, 0, 0, [79.42, 81.62, 84.73]],
    ['+ URSM',                1, 0, 0, [84.12, 86.58, 88.65]],
    ['+ URSM + SHS',          1, 1, 0, [84.17, 86.67, 88.83]],
    ['+ URSM + ISR',          1, 0, 1, [84.43, 87.14, 88.65]],
    ['ReState (full)',        1, 1, 1, [84.99, 87.96, 89.00]],
  ],
  scienceqa: [
    ['Baseline (Direct SFT)', 0, 0, 0, [96.11, 96.89, 95.59]],
    ['+ URSM',                1, 0, 0, [97.31, 97.95, 98.04]],
    ['+ URSM + SHS',          1, 1, 0, [97.38, 98.07, 98.37]],
    ['+ URSM + ISR',          1, 0, 1, [97.31, 97.95, 98.07]],
    ['ReState (full)',        1, 1, 1, [97.43, 98.16, 98.37]],
  ],
};

/* Tab.7 — VersaCoT-10K, full model minus one state type */
const STATE_ABL = [
  ['Full ReState',        [77.05, 79.25, 81.90]],
  ['w/o φ (empty)',       [75.70, 77.95, 80.15]],
  ['w/o R⁺ (positive)',   [75.65, 78.50, 79.50]],
  ['w/o R⁻ (negative)',   [76.45, 78.90, 81.75]],
  ['w/o Rʰ (historical)', [76.20, 78.65, 79.45]],
];

/* Tab.12-14 — [backbone]{method: [COT_COLS...]} */
const COT_COLS = ['Overall', 'Correctness', 'Relevance', 'Coherence', 'Solving process'];
const COT_QUALITY = [
  { 'Zero-shot': [7.30, 5.85, 8.44, 8.62, 6.29], 'Direct SFT': [7.82, 6.44, 8.84, 8.61, 7.38], 'Multimodal-CoT': [7.56, 6.29, 8.37, 8.40, 7.20], 'MIND': [8.00, 6.63, 9.01, 8.88, 7.49], 'ReState (ours)': [8.12, 6.82, 9.05, 8.96, 7.65] },
  { 'Zero-shot': [8.21, 6.93, 9.19, 9.15, 7.55], 'Direct SFT': [8.49, 7.25, 9.28, 9.13, 8.29], 'Multimodal-CoT': [8.27, 7.28, 8.87, 8.85, 8.06], 'MIND': [8.35, 7.57, 9.13, 8.65, 8.04], 'ReState (ours)': [8.85, 7.73, 9.47, 9.43, 8.78] },
  { 'Zero-shot': [7.97, 6.68, 9.01, 8.78, 7.42], 'Direct SFT': [8.25, 6.81, 9.12, 9.06, 8.00], 'Multimodal-CoT': [8.17, 7.04, 8.81, 8.91, 7.93], 'MIND': [8.42, 7.22, 9.25, 9.25, 7.98], 'ReState (ours)': [8.51, 7.32, 9.32, 9.29, 8.13] },
];

/* Tab.11 — {setting: [b0, b1, b2]} */
const GEN = {
  m3cot:     { 'Original': [59.79, 61.43, 62.81], 'Direct SFT': [58.93, 57.98, 63.11], 'ReState': [61.17, 62.12, 65.10] },
  scienceqa: { 'Original': [84.39, 90.62, 91.25], 'Direct SFT': [84.70, 89.55, 91.54], 'ReState': [85.05, 90.10, 91.94] },
};

const OPTIONS = { labels: ['2', '3', '4', '5', '6', '7', '8', '9'], counts: [1972, 330, 6223, 1399, 70, 1, 0, 5] };

const DOMAINS = [
  { name: 'Medical',  src: 'PMC-VQA',    desc: 'Medical imaging & clinical knowledge' },
  { name: 'Driving',  src: 'DrivingVQA', desc: 'Driving scenes, signs & safety' },
  { name: 'Common',   src: 'Visual7W',   desc: 'Everyday visual commonsense' },
  { name: 'Science',  src: 'AI2D',       desc: 'Scientific diagrams' },
  { name: 'Spatial',  src: 'CV-Bench',   desc: 'Spatial perception' },
  { name: 'Geometry', src: 'GeoQA',      desc: 'Geometric & mathematical reasoning' },
  { name: 'Chart',    src: 'ChartQA',    desc: 'Chart reading & computation' },
  { name: 'Expert',   src: 'MMMU',       desc: 'Multidisciplinary knowledge' },
];

/* rounds[].from : quality of the state fed into M_θ this round (post-hoc label — the
                   model itself is never told whether its state is right or wrong)
                   'empty' | 'neg' (contains an error) | 'pos' (already correct)
   rounds[].ok   : whether the model choice after this round is correct          */
const CASES = [
  {
    id: 'versacot', label: 'VersaCoT-10K · road sign', tag: 'VersaCoT-10K #5108 · Driving', fig: 'Fig. 14',
    img: 'assets/case_versacot.jpg',
    question: 'Will I be able to eat at the next highway rest area?',
    options: ['A. Yes', 'B. No'], answer: 0,
    note: 'Round 1 is distracted by the irrelevant crossed-out toilet icon. After two rounds of state feedback the model refocuses on the fork-and-knife icon, fixes the answer, then keeps it.',
    ref: 'The image shows a view from inside a vehicle driving on a highway. On the right side of the road, there is a blue highway information sign. The sign identifies the next rest area as “Aire de Solaize,” located 20 km ahead. Below the name and distance, there are two service pictograms: one depicting a fuel pump (indicating a gas station) and another depicting a crossed fork and spoon. The crossed fork and spoon symbol is the standard international road sign for a restaurant or dining facility. Therefore, the presence of this symbol on the sign for the upcoming rest area indicates that food services will be available there. The answer is (A).',
    rounds: [
      { from: 'empty', choice: 1, ok: false,
        cot: 'From the driver’s perspective on the highway, a blue sign on the right indicates the “Aire de Solize” rest area in 20 km. The sign includes two icons: a fork and knife for food services and a crossed-out toilet symbol. <e>The crossed-out toilet icon shows that the rest area lacks restrooms, which are often a key component of a full-service rest stop. Given the absence of a functional restroom, the rest area is unlikely to provide food services either.</e>' },
      { from: 'neg', choice: 1, ok: false,
        cot: 'The scene shows a highway with a blue sign on the right side announcing the “Aire de Solize” rest area in 20 km. The sign includes two icons: a fork and knife (denoting food services) and a toilet with a slash through it (denoting no restroom facilities). <e>The absence of the restroom icon suggests that the rest area is a basic stop with limited amenities, such as no food services.</e> Hence, you won’t be able to eat at the next highway rest area.' },
      { from: 'neg', choice: 0, ok: true,
        cot: 'The image captures a highway scene with a blue sign on the right indicating “Aire de Solize” is 20 km away. The sign displays two icons: a fork and knife (for dining) and a toilet with a slash (for no restrooms). <f>The presence of the fork and knife confirms that the rest area provides food services.</f> Therefore, you can eat at the next highway rest area.' },
      { from: 'pos', choice: 0, ok: true,
        cot: 'The image shows a highway with a blue sign on the right side indicating “Aire de Solize” is 20 km away. The sign includes two icons: a fork and knife (representing a restaurant or food service) and a toilet symbol with a red slash (indicating no restroom facilities). <f>The presence of the fork and knife icon confirms that the rest area provides food services.</f> Therefore, you will be able to eat at the next highway rest area.' },
    ],
  },
  {
    id: 'scienceqa', label: 'ScienceQA · food web', tag: 'ScienceQA #10709', fig: 'Fig. 15',
    img: 'assets/case_scienceqa.jpg',
    question: 'In this food web, which organism contains matter that eventually moves to the earthworm?',
    options: ['A. barren-ground caribou', 'B. mushroom', 'C. grizzly bear', 'D. bear sedge'], answer: 3,
    note: 'Round 1 constructs a wrong matter-transfer relation. Given its own state back, the model re-examines the arrow directions, corrects the relation, and preserves it afterwards.',
    ref: 'Use the arrows to follow how matter moves through this food web. For each answer choice, try to find a path of arrows to the earthworm. The only arrow pointing from the grizzly bear leads to the mushroom. No arrows point from the mushroom to any other organisms. So, in this food web, matter does not move from the grizzly bear to the earthworm. There are three paths matter can take from the bear sedge to the earthworm: bear sedge → brown lemming → Arctic fox → earthworm; bear sedge → brown lemming → snowy owl → earthworm; bear sedge → brown lemming → parasitic jaeger → rough-legged hawk → earthworm. … The answer is (D).',
    rounds: [
      { from: 'empty', choice: 0, ok: false,
        cot: 'Use arrow directions to map matter flow. Barren-ground caribou (A) connects to earthworms via two routes: <e>caribou → earthworm and caribou → grizzly bear → earthworm</e>. Mushroom (B) has no outgoing arrows, so matter stops there. Grizzly bear (C) transfers matter to mushroom, which doesn’t continue. Bear sedge (D) feeds lemmings, which then transfer to earthworms.' },
      { from: 'neg', choice: 3, ok: true,
        cot: 'Track matter flow by following arrows. For each option, find a path to the earthworm. <f>The barren-ground caribou’s arrows go to the grizzly bear and mushroom. The grizzly bear’s arrow ends at the mushroom, so matter doesn’t reach the earthworm.</f> The mushroom has no outgoing arrows, so it doesn’t transfer matter. <f>The bear sedge’s arrow leads to the brown lemming, which connects to the earthworm.</f>' },
      { from: 'pos', choice: 3, ok: true,
        cot: 'Follow the arrows to map matter movement. For each option, identify a path to the earthworm. The barren-ground caribou’s arrows go to the grizzly bear and mushroom. <f>The grizzly bear’s arrow ends at the mushroom, so matter doesn’t reach the earthworm.</f> The mushroom has no outgoing arrows, so it doesn’t transfer matter. <f>The bear sedge’s arrow leads to the brown lemming, which connects to the earthworm.</f>' },
    ],
  },
  {
    id: 'm3cot', label: 'M³CoT · buoyancy', tag: 'M³CoT #10416', fig: 'Fig. 16',
    img: 'assets/case_m3cot.jpg',
    question: 'In the provided image, how many items from the given choices will submerge underwater?',
    options: ['A. 2', 'B. 1', 'C. 0'], answer: 2,
    note: 'Round 1 already computes both densities correctly and concludes “neither sinks”, yet picks “B. 1”. The next update preserves the valid calculation and realigns the answer with it.',
    ref: 'Object D is made of rubber, weighs 3067.95 kg, and has a volume of 4.77 m³. Object C is made of glass, weighs 7891.41 kg, and has a volume of 16.42 m³. At 4 °C, water has a density of approximately 1000 kg/m³. Objects with a lower density than water float, while those with a higher density sink. The density of Object D is 643.18 kg/m³, so it floats. The density of Object C is 480.60 kg/m³, so it also floats. Therefore, 0 objects sink, and the answer is (C) 0.',
    rounds: [
      { from: 'empty', choice: 1, ok: false,
        cot: 'Step 1: The image lists Object D (rubber, 3067.95 kg, 4.77 m³) and Object C (glass, 7891.41 kg, 16.42 m³). Step 2: Water has a density of approximately 1000 kg/m³ at 4 °C; objects with lower density float, while objects with higher density sink. Step 3: Object D’s density is 3067.95 ÷ 4.77 ≈ 643.18 kg/m³, so it floats. Step 4: Object C’s density is 7891.41 ÷ 16.42 ≈ 480.60 kg/m³, so it also floats. <w>Steps 5–7: Neither object sinks; 0 items submerge.</w>' },
      { from: 'neg', choice: 2, ok: true,
        cot: 'Step 1: The image lists Object D (rubber, 3067.95 kg, 4.77 m³) and Object C (glass, 7891.41 kg, 16.42 m³). Step 2: Water has a density of approximately 1000 kg/m³ at 4 °C; objects with lower density float, while those with higher density sink. Steps 3–4: Object D’s density is 3067.95 ÷ 4.77 ≈ 643.18 kg/m³, and Object C’s density is 7891.41 ÷ 16.42 ≈ 480.60 kg/m³. Both float. <f>Steps 5–7: Neither sinks, so 0 objects are submerged. The answer is (C) 0.</f>' },
      { from: 'pos', choice: 2, ok: true,
        cot: 'Step 1: The image lists Object D (rubber, 3067.95 kg, 4.77 m³) and Object C (glass, 7891.41 kg, 16.42 m³). Step 2: At 4 °C, water has a density of 1000 kg/m³; objects with lower density float, while those with higher density sink. Steps 3–4: Object D’s density is 3067.95 ÷ 4.77 ≈ 643.18 kg/m³, and Object C’s density is 7891.41 ÷ 16.42 ≈ 480.60 kg/m³. <f>Steps 5–7: Both objects float, so 0 items sink. The answer is (C) 0.</f>' },
    ],
  },
];

/* Fig.8-13 — Direct SFT vs Multimodal-CoT vs MIND vs ReState on the same question */
const COMPARE = [
  { img: 'assets/cmp_versacot10k-case1.jpg', ds: 'VersaCoT-10K', title: 'Small-loan dilemma', fig: 'Fig. 8',
    gist: 'Baselines over-weight the “reciprocal relationship” cue and pick loan trust; ReState reads the whole diagram and identifies repayment ability.' },
  { img: 'assets/cmp_versacot10k-case2.jpg', ds: 'VersaCoT-10K', title: 'Rock cycle', fig: 'Fig. 9',
    gist: 'Baselines take E as the direct product of melting; ReState separates the magma region from solidified intrusive rock and picks A.' },
  { img: 'assets/cmp_scienceqa-case1.jpg', ds: 'ScienceQA', title: 'Fossil age', fig: 'Fig. 10',
    gist: 'All three baselines misread the layer order; ReState places the ginkgo leaf in the deeper, older layer.' },
  { img: 'assets/cmp_scienceqa-case2.jpg', ds: 'ScienceQA', title: 'Solution concentration', fig: 'Fig. 11',
    gist: 'Baselines conclude the two concentrations are equal; ReState compares particles per mL and picks Solution A.' },
  { img: 'assets/cmp_m3cot-case1.jpg', ds: 'M³CoT', title: 'Species recognition', fig: 'Fig. 12',
    gist: 'Baselines hallucinate reddish-brown spotted fur (Lynx rufus); ReState combines build, fur and face cues to reach Felis nigripes.' },
  { img: 'assets/cmp_m3cot-case2.jpg', ds: 'M³CoT', title: 'Tangram recognition', fig: 'Fig. 13',
    gist: 'Baselines see a kangaroo; ReState maps the pieces to body, wings and head and recognizes a penguin.' },
];
