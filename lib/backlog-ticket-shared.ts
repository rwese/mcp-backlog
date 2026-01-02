import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { generateBacklogFilename } from './backlog-shared.js';
import { getBacklogDir } from './path-resolver.js';

// Wordlist for readable ID generation (~300 words, 3-6 chars, easy to spell, distinct)
const WORDLIST = [
  // Animals
  "ant", "bat", "bee", "bird", "boar", "cat", "cod", "cow", "crab", "crow",
  "deer", "dog", "dove", "duck", "eel", "elk", "fish", "fly", "fox", "frog",
  "goat", "goose", "hare", "hawk", "hen", "hippo", "hog", "horse", "hound", "human",
  "ibis", "jackal", "jaguar", "kangaroo", "kite", "kitten", "koala", "lark", "lemur", "lion",
  "llama", "lobster", "lynx", "mammoth", "mantis", "marten", "midge", "mole", "mongoose", "monkey",
  "moose", "mouse", "mule", "newt", "night owl", "otter", "ox", "oyster", "panda", "panther",
  "parrot", "peacock", "penguin", "pheasant", "pig", "pigeon", "platypus", "pony", "pup", "puppy",
  "quail", "rabbit", "ram", "rat", "raven", "reindeer", "rhinoceros", "salamander", "salmon", "sardine",
  "seal", "shark", "sheep", "shrew", "shrimp", "skunk", "sloth", "snail", "snake", "spider",
  "squid", "squirrel", "starfish", "stork", "swan", "tapir", "tarantula", "tiger", "toad", "trout",
  "turkey", "turtle", "viper", "vulture", "wallaby", "walrus", "wasp", "weasel", "whale", "wolf",
  "wombat", "woodpecker", "worm", "yak", "zebra",
  // Nature
  "acre", "arch", "bank", "bark", "barn", "basin", "beach", "beck", "bed", "bell",
  "bench", "berg", "bight", "birch", "bloom", "bluff", "bog", "bolt", "boom", "bore",
  "boulder", "bourne", "branch", "brae", "break", "brook", "bush", "butte", "cave", "cedar",
  "cliff", "cloud", "coast", "coral", "cove", "crag", "creek", "crust", "dale", "dam",
  "dell", "delta", "desert", "dike", "dine", "dune", "earth", "eden", "edge", "elm",
  "erosion", "estuary", "fall", "farm", "fen", "field", "fir", "fjord", "flats", "flood",
  "forest", "forge", "fountain", "frost", "gap", "garden", "gate", "gem", "glen", "grove",
  "gulf", "hills", "hollow", "ice", "island", "isle", "jungle", "kettle", "key", "kin",
  "lake", "land", "lap", "larch", "lava", "lawn", "leaf", "levee", "lichen", "lilac",
  "limestone", "marsh", "meadow", "melt", "mere", "mire", "mist", "moor", "moss", "mountain",
  "muddy", "nectar", "nettle", "niche", "oak", "ocean", "orchard", "orchid", "ore", "outcrop",
  "overlook", "overn", "patch", "peak", "petal", "pine", "pit", "pond", "prairie", "prism",
  "quartz", "rain", "rake", "range", "reef", "ridge", "rift", "river", "rock", "rose",
  "ruin", "run", "sand", "sap", "savanna", "scar", "scarp", "sea", "sediment", "seed",
  "shale", "shingle", "shore", "shrub", "silk", "silt", "slate", "slope", "snow", "soil",
  "sorrel", "spit", "spring", "spruce", "stalk", "star", "stone", "storm", "straw", "stream",
  "summit", "sun", "swale", "swamp", "sward", "swirl", "terrace", "thicket", "thorn", "timber",
  "toadstool", "tree", "treetop", "tropics", "tundra", "valley", "vine", "vista", "volcano", "wash",
  "water", "wave", "weathering", "weep", "willow", "wind", "wood", "wreath", "xylem", "yarrow",
  "yearling", "zephyr",
  // Actions/States
  "ask", "bake", "balance", "ban", "bar", "bargain", "bark", "bask", "bathe", "be",
  "beckon", "beg", "behave", "bend", "bet", "bid", "bind", "bite", "bleed", "bless",
  "blight", "blink", "blot", "blush", "boast", "boost", "bore", "borrow", "bounce", "bow",
  "box", "brake", "branch", "breathe", "breed", "brisk", "broadcast", "browse", "brush", "bubble",
  "build", "burn", "bury", "buzz", "calculate", "call", "calm", "care", "carry", "carve",
  "catch", "cause", "caution", "cease", "chain", "challenge", "change", "charge", "chase", "chat",
  "cheat", "check", "cheer", "chew", "chop", "claim", "clap", "clarify", "clash", "clasp",
  "classify", "clean", "climb", "cling", "clip", "cloak", "clock", "close", "clothe", "cloud",
  "coach", "coast", "coax", "code", "collect", "color", "comb", "comfort", "command", "comment",
  "commit", "communicate", "compare", "compete", "complain", "complete", "concentrate", "concern", "conclude", "conduct",
  "confess", "confirm", "conflict", "confuse", "connect", "consider", "consist", "contain", "content", "contest",
  "continue", "contract", "contrast", "contribute", "control", "convince", "cook", "cool", "cope", "copy",
  "correct", "cough", "count", "cover", "crack", "craft", "crash", "crawl", "create", "credit",
  "creep", "cross", "crowd", "crush", "cry", "cure", "curl", "curse", "curve", "cut",
  "cycle", "damp", "dance", "dare", "dash", "date", "dawn", "deal", "debate", "decay",
  "decide", "decorate", "decrease", "defend", "define", "dehydrate", "delay", "delegate", "deliver", "demand",
  "demonstrate", "deny", "deposit", "descend", "describe", "desert", "deserve", "design", "desire", "destroy",
  "detect", "determine", "develop", "devote", "diagnose", "dig", "dilute", "dip", "direct", "disagree",
  "disappear", "disappoint", "disapprove", "disarm", "discover", "discuss", "dislike", "dismantle", "display", "dispute",
  "dissolve", "distinguish", "distort", "distribute", "disturb", "dive", "divide", "doubt", "drag", "drain",
  "draw", "dream", "dress", "drift", "drill", "drink", "drive", "drown", "drunk", "dry",
  "dump", "dust", "dwarf", "dwell", "dye", "earn", "ease", "eat", "echo", "edit",
  "educate", "elaborate", "elapse", "elastic", "elect", "elevate", "eliminate", "embark", "embody", "embrace",
  "emerge", "emit", "emphasize", "employ", "empower", "empty", "enable", "encircle", "enclose", "encourage",
  "encounter", "encourage", "end", "endanger", "endure", "energize", "engage", "enhance", "enjoy", "enlarge",
  "enlighten", "enrich", "enroll", "ensure", "enter", "entertain", "enthusiastic", "entitle", "entrance", "envy",
  "equal", "equip", "erode", "escape", "establish", "esteem", "estimate", "evaluate", "evaporate", "evoke",
  "evolve", "exaggerate", "examine", "exceed", "exchange", "excite", "exclude", "excuse", "execute", "exercise",
  "exhaust", "expand", "expect", "expel", "exploit", "explode", "explore", "expose", "express", "extend",
  "extract", "fabricate", "face", "fade", "fail", "faint", "fair", "faith", "fake", "fall",
  "falsify", "familiar", "fancy", "fascinate", "fast", "fat", "fate", "fault", "favor", "fear",
  "feast", "federal", "feed", "feel", "fence", "fetch", "fever", "fight", "file", "fill",
  "filth", "final", "finance", "fine", "finger", "finish", "fire", "firm", "fish", "fit",
  "fix", "flame", "flash", "flee", "fling", "flip", "float", "flock", "flood", "floor",
  "flourish", "flow", "flower", "flu", "flush", "fly", "foam", "focus", "fold", "follow",
  "fool", "force", "forecast", "forehead", "forge", "forgive", "forgot", "fork", "form", "format",
  "formulate", "foster", "found", "fraction", "fracture", "frame", "fraud", "free", "freeze", "fresh",
  "friend", "fright", "frog", "front", "frost", "frown", "froze", "fruit", "frustrate", "fry",
  "fulfill", "fun", "functional", "fund", "fuse", "gain", "gallop", "game", "gap", "garage",
  "garden", "gather", "gaze", "gear", "gem", "generate", "gift", "ginger", "give", "glad",
  "glance", "glare", "glide", "glimpse", "glow", "glue", "goal", "goat", "gold", "golf",
  "gone", "good", "gown", "grab", "grace", "grade", "grain", "grand", "grant", "grape",
  "graph", "grasp", "grass", "gravity", "gray", "greet", "grief", "grill", "grind", "grip",
  "groan", "groom", "group", "grow", "growth", "guard", "guess", "guide", "guilt", "guitar",
  "halt", "hammer", "hand", "handle", "hang", "happen", "happy", "harbor", "hard", "harm",
  "harvest", "hate", "haunt", "head", "heal", "health", "heap", "hear", "heart", "heat",
  "heaven", "hedge", "height", "heir", "helicopter", "hello", "help", "herb", "herd", "hide",
  "high", "highlight", "hill", "hint", "hip", "hire", "history", "hit", "hobby", "hold",
  "hole", "holiday", "hollow", "home", "honest", "honor", "hook", "hope", "horn", "horror",
  "horse", "host", "hot", "hotel", "hour", "house", "hover", "hub", "hug", "huge",
  "hum", "humble", "hunt", "hurdle", "hurl", "hurt", "hut", "hybrid", "ice", "icon",
  "idea", "identify", "idle", "ignite", "ignore", "ill", "illustrate", "image", "immense", "immune",
  "impact", "implement", "imply", "import", "impose", "impress", "improve", "impulse", "include", "increase",
  "indicate", "individual", "indoor", "industry", "infant", "influence", "inform", "inhale", "inherit", "initial",
  "inject", "injury", "ink", "inn", "innocent", "input", "inquire", "insect", "insert", "inside",
  "inspire", "install", "instant", "instrument", "insulate", "insurance", "intellectual", "intend", "intense", "intent",
  "interact", "interest", "interfere", "internal", "interpret", "interrupt", "interval", "interview", "introduce", "invade",
  "invent", "invest", "investigate", "invite", "involve", "iron", "isolate", "issue", "item", "ivory",
  "jacket", "jail", "jam", "jar", "jaw", "jazz", "jealous", "jeopardy", "jet", "job",
  "join", "joke", "journey", "joy", "judge", "jug", "juice", "jump", "jungle", "junior",
  "jury", "just", "kangaroo", "keen", "keep", "kernel", "kick", "kid", "kill", "kind",
  "kingdom", "kiss", "kitchen", "kite", "kitten", "kiwi", "knee", "knife", "knit", "knob",
  "knot", "know", "lab", "label", "labor", "lace", "lack", "ladder", "lady", "lake",
  "lamp", "land", "landscape", "lane", "language", "lap", "large", "laser", "last", "late",
  "laugh", "launch", "lava", "lawn", "law", "layer", "lead", "leaf", "leak", "lean",
  "leap", "learn", "lease", "leather", "leave", "lecture", "left", "leg", "legal", "legend",
  "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "lever", "liberty",
  "library", "license", "lid", "lie", "life", "lift", "light", "like", "limb", "limit",
  "limp", "line", "link", "lion", "lip", "liquid", "listen", "liter", "litter", "little",
  "live", "load", "loan", "lobster", "local", "lock", "logic", "logo", "lonely", "long",
  "look", "loop", "lord", "lose", "loss", "lost", "lot", "loud", "love", "low",
  "loyal", "luck", "luggage", "lump", "lunch", "luxury", "machine", "magazine", "magic", "maid",
  "mail", "main", "major", "make", "male", "mall", "mammal", "man", "manage", "mandate",
  "mango", "manner", "manual", "manufacture", "map", "marble", "margin", "marine", "mark", "market",
  "mars", "mask", "mass", "master", "match", "material", "matrix", "matter", "maximum", "meal",
  "measure", "meat", "mechanic", "medal", "medical", "medicine", "medium", "meet", "member", "memory",
  "mental", "mention", "menu", "merit", "message", "metal", "meter", "method", "middle", "military",
  "milk", "million", "mind", "mine", "minimum", "minor", "minute", "mirror", "misery", "miss",
  "mission", "mist", "mix", "mobile", "mode", "model", "modify", "module", "molecule", "moment",
  "monitor", "month", "moon", "moral", "more", "morning", "mosquito", "most", "mother", "motion",
  "motor", "mount", "mountain", "mouse", "mouth", "move", "much", "multiple", "muscle", "museum",
  "music", "must", "mute", "mystery", "myth", "nail", "name", "napkin", "narrow", "nation",
  "native", "nature", "near", "neat", "necessary", "neck", "need", "needle", "negative", "neglect",
  "neighbor", "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never", "new",
  "news", "nice", "night", "nine", "noble", "node", "noise", "nominee", "none", "noon",
  "norm", "north", "nose", "note", "nothing", "notice", "noun", "novel", "now", "nuclear",
  "nucleus", "nuisance", "number", "nurse", "nut", "oak", "object", "obtain", "ocean", "october",
  "off", "offer", "office", "often", "oil", "old", "olive", "omen", "omit", "once",
  "one", "onion", "only", "open", "operate", "opinion", "opponent", "opportunity", "oppose", "option",
  "orange", "orbit", "orchard", "order", "ordinary", "organ", "organic", "organize", "orient", "origin",
  "ornament", "orphan", "other", "outdoor", "outer", "output", "outside", "oval", "oven", "over",
  "own", "owner", "oxygen", "ozone", "packet", "page", "paid", "pain", "paint", "pair",
  "palace", "palm", "pan", "panel", "panic", "pants", "paper", "parade", "parent", "park",
  "part", "party", "pass", "past", "paste", "pat", "patch", "path", "patience", "patrol",
  "pattern", "pause", "pavement", "pay", "peace", "peak", "pearl", "pedal", "peel", "peer",
  "pen", "penalty", "pencil", "penny", "people", "pepper", "per", "perfect", "perform", "perfume",
  "period", "permit", "person", "personal", "perspective", "persuade", "pest", "pet", "phase",
  "phone", "photo", "phrase", "physical", "piano", "pick", "picture", "pie", "piece", "pig",
  "pile", "pill", "pillow", "pilot", "pin", "pinch", "pine", "pink", "pioneer", "pipe",
  "pistol", "pitch", "pizza", "place", "plaid", "plain", "plan", "plane", "planet", "plant",
  "plate", "play", "plaza", "plea", "please", "pledge", "plenty", "plot", "plough", "plow",
  "plug", "plunge", "plus", "pocket", "poem", "poet", "point", "poison", "pole", "police",
  "pond", "pony", "pool", "poor", "popular", "porch", "pork", "port", "pose", "position",
  "positive", "possess", "possible", "post", "potato", "potential", "pound", "pour", "powder", "power",
  "practice", "praise", "pray", "preach", "precis", "predict", "prefer", "premium", "prepare", "presence",
  "present", "preserve", "president", "press", "pressure", "pretty", "prevent", "prey", "price", "pride",
  "priest", "primary", "prime", "print", "prior", "priority", "prison", "private", "prize", "problem",
  "procedure", "proceed", "process", "produce", "product", "profit", "program", "progress", "project", "promise",
  "promote", "prompt", "proper", "property", "proportion", "proposal", "propose", "prospect", "protect", "protest",
  "proud", "provide", "province", "provision", "public", "pulse", "pump", "punch", "pupil", "purchase",
  "purple", "purpose", "push", "puzzle", "pyramid", "quality", "quantity", "quarter", "queen", "question",
  "quick", "quiet", "quilt", "quit", "quite", "quota", "quote", "rabbit", "race", "rack",
  "radar", "radio", "radius", "raft", "rage", "raid", "rail", "rain", "raise", "rally",
  "ranch", "range", "rank", "rapid", "rare", "rate", "rather", "ratio", "reach", "react",
  "read", "reader", "real", "reality", "realm", "rear", "reason", "rebel", "recall", "receive",
  "recent", "reception", "recipe", "recognize", "recollect", "rectify", "reduce", "reform", "refuge", "refuse",
  "regard", "regime", "region", "register", "regret", "regular", "reject", "rejoice", "relate", "relation",
  "relative", "relax", "release", "relevant", "reliable", "relief", "religion", "remain", "remarkable", "remember",
  "remind", "remote", "remove", "render", "renew", "rent", "repair", "repeat", "repel", "reply",
  "report", "represent", "reproduce", "request", "require", "rescue", "resent", "reserve", "residence", "resident",
  "resist", "resolution", "resolve", "resort", "resource", "respect", "respond", "response", "responsibility", "rest",
  "result", "retail", "retain", "retire", "return", "reveal", "revenue", "review", "revise", "revolution",
  "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right",
  "rigid", "ring", "riot", "ripe", "rise", "risk", "ritual", "rival", "river", "road",
  "roar", "roast", "robe", "robot", "rock", "role", "roll", "romance", "roof", "room",
  "root", "rope", "rose", "rotate", "rotten", "rough", "round", "route", "royal", "rub",
  "rubber", "rude", "rug", "rule", "run", "rural", "rush", "sack", "sad", "saddle",
  "safe", "safety", "sail", "salad", "salary", "sale", "salt", "salute", "same", "sample",
  "sand", "satisfy", "sauce", "sausage", "save", "say", "scale", "scan", "scar", "scene",
  "scent", "schedule", "scheme", "school", "science", "scissors", "score", "scorn", "scout", "scrap",
  "scratch", "scream", "screen", "screw", "script", "scrub", "sea", "search", "season", "seat",
  "second", "secret", "section", "secure", "see", "seed", "seek", "seem", "segment", "seize",
  "seldom", "select", "sell", "send", "senior", "sense", "sentence", "separate", "sequence", "serial",
  "series", "serious", "servant", "serve", "service", "session", "set", "setting", "settle", "setup",
  "seven", "sever", "severe", "sew", "shade", "shadow", "shake", "shall", "shallow", "shame",
  "shape", "share", "sharp", "shave", "she", "shed", "sheep", "sheet", "shelf", "shell",
  "shelter", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop",
  "shore", "short", "should", "shout", "shove", "show", "shower", "shrink", "shrug", "shut",
  "shuttle", "sick", "side", "siege", "sigh", "sight", "sign", "signal", "silence", "silk",
  "silly", "silver", "simple", "since", "sing", "siren", "sister", "sit", "site", "six",
  "sixth", "size", "sketch", "ski", "skill", "skin", "skirt", "skull", "sky", "slab",
  "slack", "slain", "slam", "slap", "slash", "slate", "slave", "sleep", "sleet", "slice",
  "slide", "slight", "slim", "sling", "slip", "slope", "slow", "slump", "small", "smart",
  "smash", "smell", "smile", "smoke", "smooth", "snake", "snap", "snare", "snatch", "sneak",
  "snow", "soap", "soar", "social", "sock", "soda", "sofa", "soft", "soil", "soldier",
  "sole", "solve", "some", "son", "song", "soon", "sore", "sorry", "sort", "soul",
  "sound", "soup", "sour", "source", "south", "space", "spare", "spark", "speak", "spear",
  "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike", "spill", "spin",
  "spine", "spiral", "spirit", "spit", "splash", "split", "spoil", "spoke", "sponge", "sport",
  "spot", "spray", "spread", "spring", "sprint", "spur", "squad", "square", "squeeze", "stack",
  "staff", "stage", "stain", "stair", "stake", "stale", "stall", "stamp", "stand", "star",
  "stare", "stark", "start", "state", "static", "statue", "status", "stay", "steak", "steal",
  "steam", "steel", "steep", "steer", "stem", "step", "stern", "stick", "stiff", "still",
  "sting", "stir", "stock", "stomach", "stone", "stool", "stop", "store", "storm", "story",
  "stove", "straight", "strain", "strand", "strange", "strap", "straw", "stray", "street",
  "stress", "stretch", "strict", "stride", "strife", "strike", "string", "strip", "strive",
  "stroke", "strong", "structure", "struggle", "stubborn", "student", "studio", "study", "stuff",
  "stump", "stupid", "subject", "submit", "subtle", "suburb", "succeed", "such", "sudden", "suffer",
  "sugar", "suggest", "suicide", "suit", "summer", "summit", "sun", "sunrise", "sunset", "super",
  "supply", "support", "suppose", "sure", "surface", "surge", "surprise", "surround", "survey", "suspect",
  "sustain", "swallow", "swamp", "swan", "swarm", "sway", "swear", "sweat", "sweep", "sweet",
  "swell", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system",
  "table", "tackle", "tag", "tail", "take", "tale", "talk", "tall", "tank", "tape",
  "target", "task", "taste", "taxi", "teach", "team", "tear", "technical", "technique", "tedious",
  "teen", "telephone", "television", "tell", "temperature", "temple", "tend", "tender", "tennis",
  "tent", "term", "terrible", "test", "text", "thank", "theft", "their", "theme", "then",
  "theory", "there", "these", "thick", "thin", "thing", "think", "third", "thirst", "this",
  "thorough", "those", "though", "thought", "thread", "threat", "three", "thrill", "thrive", "throat",
  "through", "throw", "thumb", "thunder", "ticket", "tide", "tidy", "tie", "tiger", "tile",
  "tilt", "time", "tiny", "tire", "title", "toast", "today", "toe", "together", "toilet",
  "tomorrow", "tone", "tongue", "tonight", "too", "tool", "tooth", "top", "topic", "topple",
  "torch", "total", "touch", "tough", "tour", "toward", "tower", "town", "toy", "trace",
  "track", "trade", "tradition", "traffic", "tragedy", "trail", "train", "trait", "tramp", "trap",
  "trash", "travel", "treat", "tree", "trek", "trend", "trial", "tribe", "trick", "trigger",
  "trim", "trip", "triumph", "trolley", "troop", "trouble", "trousers", "truck", "truly", "trumpet",
  "trunk", "trust", "truth", "try", "tube", "tumble", "tuna", "tunnel", "turkey", "turn",
  "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "ugly", "ulcer",
  "umbrella", "unable", "unaware", "uncle", "under", "unfair", "unfold", "unhappy", "uniform", "unique",
  "unit", "universe", "unknown", "unlock", "until", "unusual", "unwanted", "uphold", "upon", "upper",
  "upset", "urban", "urge", "usage", "use", "used", "useful", "user", "usual", "utility",
  "utter", "vacant", "vacation", "vacuum", "vague", "vain", "vale", "valid", "valley", "valuable",
  "value", "valve", "van", "vanish", "variable", "variant", "variety", "various", "vary", "vast",
  "vegetable", "vehicle", "vein", "velvet", "vendor", "venom", "vent", "venture", "venue", "verb",
  "verdict", "verse", "version", "vertical", "very", "vessel", "vest", "veteran", "vial", "victim",
  "victory", "video", "view", "village", "vine", "violin", "virtual", "virus", "visa", "visit",
  "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "volunteer", "vote",
  "voucher", "voyage", "vulnerable", "wage", "wagon", "waist", "wait", "wake", "walk", "wall",
  "walnut", "want", "war", "ward", "warm", "warn", "warrant", "warrior", "wash", "waste",
  "watch", "water", "wave", "way", "weak", "wealth", "weapon", "wear", "weasel", "weather",
  "web", "wedding", "week", "weep", "weigh", "weight", "weird", "welcome", "well", "west",
  "wet", "whale", "what", "wheat", "wheel", "when", "where", "whether", "which", "while",
  "whisper", "whistle", "white", "who", "whole", "why", "wide", "widow", "width", "wild",
  "will", "win", "wind", "window", "wine", "wing", "wink", "winner", "winter", "wire",
  "wisdom", "wise", "wish", "wit", "witch", "with", "withdraw", "within", "without", "witness",
  "wolf", "woman", "wonder", "wood", "wool", "word", "work", "world", "worm", "worry",
  "worth", "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "yarn", "year",
  "yellow", "yes", "yesterday", "yet", "yield", "you", "young", "youth", "zebra", "zero",
  "zinc", "zone", "zoom"
];

let wordlistInitialized = false;

function initializeWordlist() {
  if (!wordlistInitialized) {
    // Shuffle the wordlist on first use
    for (let i = WORDLIST.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [WORDLIST[i], WORDLIST[j]] = [WORDLIST[j], WORDLIST[i]];
    }
    wordlistInitialized = true;
  }
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  initializeWordlist();
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a 3-word readable ID with hyphens
 * Example: "brave-crane-delta"
 */
export function generateReadableId(): string {
  initializeWordlist();
  const words: string[] = [];
  for (let i = 0; i < 3; i++) {
    const word = WORDLIST[randomInt(0, WORDLIST.length - 1)];
    words.push(word.toLowerCase().replace(/\s+/g, '-'));
  }
  return words.join('-');
}

/**
 * Generate a session ID with 3 words
 * Uses different random selection for variety
 */
export function generateSessionId(): string {
  return generateReadableId();
}

export interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  batch: string | null;
  dependencies: string[];
  created: string;
  agent: string;
  session: string;
}

export interface TodoData {
  backlogTopic: string;
  todos: Todo[];
}

export interface Context {
  agent: string;
  sessionID: string;
}

export function getBacklogItemPath(topic: string): string {
  const normalized = generateBacklogFilename(topic);
  const backlogDir = getBacklogDir();
  return `${backlogDir}/${normalized}/item.md`;
}

export function getTodosFilePath(topic: string): string {
  const normalized = generateBacklogFilename(topic);
  const backlogDir = getBacklogDir();
  return `${backlogDir}/${normalized}/todos.json`;
}

export function ensureTodosDirectory(topic: string): void {
  const normalized = generateBacklogFilename(topic);
  const backlogDir = getBacklogDir();
  const dirPath = `${backlogDir}/${normalized}`;
  mkdirSync(dirPath, { recursive: true });
}

export function readTodos(topic: string): TodoData {
  const filePath = getTodosFilePath(topic);
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist or is invalid, return empty structure
    return { backlogTopic: topic, todos: [] };
  }
}

export function writeTodos(topic: string, data: TodoData): void {
  ensureTodosDirectory(topic);
  const filePath = getTodosFilePath(topic);
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filePath, json);
}

export function createTodo(topic: string, content: string, context: Context): Todo {
  const id = generateReadableId();

  const todo: Todo = {
    id,
    content,
    status: "pending",
    batch: null,
    dependencies: [],
    created: new Date().toISOString(),
    agent: context.agent,
    session: context.sessionID
  };

  const data = readTodos(topic);
  data.todos.push(todo);
  writeTodos(topic, data);
  return todo;
}

export function updateTodoStatus(topic: string, todoId: string, newStatus: string): Todo {
  const data = readTodos(topic);
  const todo = data.todos.find(t => t.id === todoId);
  if (!todo) {
    throw new Error(`Todo with ID ${todoId} not found in topic ${topic}`);
  }

  const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
  }

  todo.status = newStatus as Todo['status'];
  writeTodos(topic, data);
  return todo;
}

export function listTodos(topic: string, filters?: { status?: string, batch?: string }): Todo[] {
  const data = readTodos(topic);
  let todos = data.todos;

  if (filters?.status) {
    todos = todos.filter(t => t.status === filters.status);
  }

  if (filters?.batch) {
    todos = todos.filter(t => t.batch === filters.batch);
  }

  return todos;
}

export function validateDependencies(todos: Todo[], todoId: string): { valid: boolean, missing: string[], incomplete: string[] } {
  const todo = todos.find(t => t.id === todoId);
  if (!todo) {
    throw new Error(`Todo with ID ${todoId} not found`);
  }

  const missing: string[] = [];
  const incomplete: string[] = [];

  for (const depId of todo.dependencies) {
    const dep = todos.find(t => t.id === depId);
    if (!dep) {
      missing.push(depId);
    } else if (dep.status !== "completed") {
      incomplete.push(depId);
    }
  }

  return {
    valid: missing.length === 0 && incomplete.length === 0,
    missing,
    incomplete
  };
}