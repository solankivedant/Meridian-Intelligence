/**
 * The companies the archive talks about, and how to find them in a headline.
 *
 * This is the same technique as the sector tags in `lib/categorize.ts` - a
 * curated dictionary of phrases, matched at ingest - and it is deliberately
 * not an NER model. Three reasons, in order of weight: a dictionary is
 * auditable (every match traces to a line in this file), it costs nothing per
 * row, and it is *precise*, which matters far more here than recall. A sector
 * tag that fires wrongly puts one story on the wrong desk; a company tag that
 * fires wrongly puts a story on a page about a named business, which is a
 * claim about that business.
 *
 * ## Matching
 *
 * Unlike `categorize()`, matching here runs over a haystack with every
 * non-alphanumeric character collapsed to a space, and every alias padded to
 * whole words. That difference is load-bearing. Company names are short, they
 * are frequently initialisms, and they arrive wrapped in punctuation:
 * "ONGC's Q2", "(NSE: SBIN)", "L&T", "Divi's". A raw `includes` on a
 * three-letter alias matches inside other words, and an alias written with
 * punctuation matches nothing at all.
 *
 * ## The traps
 *
 * A handful of Indian tickers collide with ordinary business vocabulary, and
 * each is handled by writing a longer alias rather than by adding machinery:
 *
 *  - **ITC** is also "input tax credit", which appears in every second GST
 *    story. Matched only as "ITC Limited" / "ITC Ltd" / "ITC Hotels".
 *  - **IOC** is also the International Olympic Committee. Matched as
 *    "Indian Oil" / "IOCL".
 *  - **SAIL** is also a verb. Matched as "Steel Authority".
 *  - **BEL**, **VI**, **ACC**, **OIL** and **IndiGo** are common words or
 *    fragments; each is matched by its long form only.
 *
 * A company can legitimately match through more than one entry - an SBI Cards
 * story is an SBI story - and the extractor returns every match rather than
 * picking one. For a timeline that is the right answer.
 *
 * ## Coverage
 *
 * Around two hundred names: the large-cap index constituents, the PSUs whose
 * announcements are policy events in their own right, and the new-age listings
 * and large private companies this archive covers heavily. It is deliberately
 * not "every listed company" - the long tail of small caps is almost never
 * named in the feeds this app ingests, and each extra entry is another chance
 * to match something that is not a company at all. Adding one is a line in
 * this file followed by `npm run entities -- --apply`.
 */

export type Company = {
  /** URL slug, and the value stored on `Article.entities`. */
  key: string;
  name: string;
  /** Exchange symbol. Empty for the private companies below. */
  ticker: string;
  listed: boolean;
  /** One of the sector tag keys in `lib/categorize.ts`. */
  sector: string;
  /** Promoter or conglomerate group, where the group is itself a story. */
  group?: string;
  /** Phrases that identify this company. Written naturally; normalised below. */
  aliases: string[];
};

export const COMPANIES: Company[] = [
  // ---- Banking & NBFC ----------------------------------------------------
  { key: "hdfc-bank", name: "HDFC Bank", ticker: "HDFCBANK", listed: true, sector: "banking", aliases: ["HDFC Bank"] },
  { key: "icici-bank", name: "ICICI Bank", ticker: "ICICIBANK", listed: true, sector: "banking", aliases: ["ICICI Bank", "ICICI"] },
  { key: "state-bank-of-india", name: "State Bank of India", ticker: "SBIN", listed: true, sector: "banking", aliases: ["State Bank of India", "SBI"] },
  { key: "axis-bank", name: "Axis Bank", ticker: "AXISBANK", listed: true, sector: "banking", aliases: ["Axis Bank"] },
  { key: "kotak-mahindra-bank", name: "Kotak Mahindra Bank", ticker: "KOTAKBANK", listed: true, sector: "banking", group: "Kotak", aliases: ["Kotak Mahindra", "Kotak Bank"] },
  { key: "indusind-bank", name: "IndusInd Bank", ticker: "INDUSINDBK", listed: true, sector: "banking", aliases: ["IndusInd"] },
  { key: "bank-of-baroda", name: "Bank of Baroda", ticker: "BANKBARODA", listed: true, sector: "banking", aliases: ["Bank of Baroda"] },
  { key: "punjab-national-bank", name: "Punjab National Bank", ticker: "PNB", listed: true, sector: "banking", aliases: ["Punjab National Bank", "PNB"] },
  { key: "canara-bank", name: "Canara Bank", ticker: "CANBK", listed: true, sector: "banking", aliases: ["Canara Bank"] },
  { key: "union-bank-of-india", name: "Union Bank of India", ticker: "UNIONBANK", listed: true, sector: "banking", aliases: ["Union Bank of India"] },
  { key: "bank-of-india", name: "Bank of India", ticker: "BANKINDIA", listed: true, sector: "banking", aliases: ["Bank of India"] },
  { key: "central-bank-of-india", name: "Central Bank of India", ticker: "CENTRALBK", listed: true, sector: "banking", aliases: ["Central Bank of India"] },
  { key: "indian-bank", name: "Indian Bank", ticker: "INDIANB", listed: true, sector: "banking", aliases: ["Indian Bank"] },
  { key: "idfc-first-bank", name: "IDFC First Bank", ticker: "IDFCFIRSTB", listed: true, sector: "banking", aliases: ["IDFC First"] },
  { key: "yes-bank", name: "Yes Bank", ticker: "YESBANK", listed: true, sector: "banking", aliases: ["Yes Bank"] },
  { key: "federal-bank", name: "Federal Bank", ticker: "FEDERALBNK", listed: true, sector: "banking", aliases: ["Federal Bank"] },
  { key: "rbl-bank", name: "RBL Bank", ticker: "RBLBANK", listed: true, sector: "banking", aliases: ["RBL Bank"] },
  { key: "au-small-finance-bank", name: "AU Small Finance Bank", ticker: "AUBANK", listed: true, sector: "banking", aliases: ["AU Small Finance"] },
  { key: "bandhan-bank", name: "Bandhan Bank", ticker: "BANDHANBNK", listed: true, sector: "banking", aliases: ["Bandhan Bank"] },
  { key: "bajaj-finance", name: "Bajaj Finance", ticker: "BAJFINANCE", listed: true, sector: "banking", group: "Bajaj", aliases: ["Bajaj Finance"] },
  { key: "bajaj-finserv", name: "Bajaj Finserv", ticker: "BAJAJFINSV", listed: true, sector: "banking", group: "Bajaj", aliases: ["Bajaj Finserv"] },
  { key: "shriram-finance", name: "Shriram Finance", ticker: "SHRIRAMFIN", listed: true, sector: "banking", aliases: ["Shriram Finance"] },
  { key: "cholamandalam", name: "Cholamandalam Investment", ticker: "CHOLAFIN", listed: true, sector: "banking", group: "Murugappa", aliases: ["Cholamandalam"] },
  { key: "muthoot-finance", name: "Muthoot Finance", ticker: "MUTHOOTFIN", listed: true, sector: "banking", aliases: ["Muthoot Finance"] },
  { key: "power-finance-corporation", name: "Power Finance Corporation", ticker: "PFC", listed: true, sector: "banking", aliases: ["Power Finance Corporation"] },
  { key: "rec-limited", name: "REC Limited", ticker: "RECLTD", listed: true, sector: "banking", aliases: ["REC Limited", "Rural Electrification Corporation"] },
  { key: "lic-housing-finance", name: "LIC Housing Finance", ticker: "LICHSGFIN", listed: true, sector: "banking", aliases: ["LIC Housing"] },
  { key: "sbi-cards", name: "SBI Cards", ticker: "SBICARD", listed: true, sector: "fintech", aliases: ["SBI Cards", "SBI Card"] },
  { key: "jio-financial-services", name: "Jio Financial Services", ticker: "JIOFIN", listed: true, sector: "banking", group: "Reliance", aliases: ["Jio Financial"] },

  // ---- Insurance, AMCs, exchanges & brokers ------------------------------
  { key: "life-insurance-corporation", name: "Life Insurance Corporation", ticker: "LICI", listed: true, sector: "finance-stocks", aliases: ["Life Insurance Corporation", "LIC"] },
  { key: "hdfc-life", name: "HDFC Life", ticker: "HDFCLIFE", listed: true, sector: "finance-stocks", aliases: ["HDFC Life"] },
  { key: "sbi-life", name: "SBI Life", ticker: "SBILIFE", listed: true, sector: "finance-stocks", aliases: ["SBI Life"] },
  { key: "icici-prudential-life", name: "ICICI Prudential Life", ticker: "ICICIPRULI", listed: true, sector: "finance-stocks", aliases: ["ICICI Prudential"] },
  { key: "icici-lombard", name: "ICICI Lombard", ticker: "ICICIGI", listed: true, sector: "finance-stocks", aliases: ["ICICI Lombard"] },
  { key: "max-financial", name: "Max Financial Services", ticker: "MFSL", listed: true, sector: "finance-stocks", aliases: ["Max Financial", "Max Life"] },
  { key: "star-health", name: "Star Health Insurance", ticker: "STARHEALTH", listed: true, sector: "finance-stocks", aliases: ["Star Health"] },
  { key: "new-india-assurance", name: "New India Assurance", ticker: "NIACL", listed: true, sector: "finance-stocks", aliases: ["New India Assurance"] },
  { key: "general-insurance-corporation", name: "General Insurance Corporation", ticker: "GICRE", listed: true, sector: "finance-stocks", aliases: ["General Insurance Corporation"] },
  { key: "hdfc-amc", name: "HDFC Asset Management", ticker: "HDFCAMC", listed: true, sector: "finance-stocks", aliases: ["HDFC AMC", "HDFC Asset Management"] },
  { key: "nippon-life-india-amc", name: "Nippon Life India AMC", ticker: "NAM-INDIA", listed: true, sector: "finance-stocks", aliases: ["Nippon Life India"] },
  { key: "uti-amc", name: "UTI Asset Management", ticker: "UTIAMC", listed: true, sector: "finance-stocks", aliases: ["UTI AMC", "UTI Asset Management"] },
  { key: "aditya-birla-sun-life-amc", name: "Aditya Birla Sun Life AMC", ticker: "ABSLAMC", listed: true, sector: "finance-stocks", group: "Aditya Birla", aliases: ["Aditya Birla Sun Life"] },
  { key: "bse-limited", name: "BSE Limited", ticker: "BSE", listed: true, sector: "finance-stocks", aliases: ["BSE Limited", "Bombay Stock Exchange"] },
  { key: "multi-commodity-exchange", name: "Multi Commodity Exchange", ticker: "MCX", listed: true, sector: "finance-stocks", aliases: ["Multi Commodity Exchange", "MCX"] },
  { key: "cdsl", name: "Central Depository Services", ticker: "CDSL", listed: true, sector: "finance-stocks", aliases: ["Central Depository Services", "CDSL"] },
  { key: "angel-one", name: "Angel One", ticker: "ANGELONE", listed: true, sector: "finance-stocks", aliases: ["Angel One"] },
  { key: "motilal-oswal", name: "Motilal Oswal", ticker: "MOTILALOFS", listed: true, sector: "finance-stocks", aliases: ["Motilal Oswal"] },
  { key: "iifl-finance", name: "IIFL Finance", ticker: "IIFL", listed: true, sector: "finance-stocks", aliases: ["IIFL"] },
  { key: "nuvama", name: "Nuvama Wealth", ticker: "NUVAMA", listed: true, sector: "finance-stocks", aliases: ["Nuvama"] },
  { key: "cams", name: "Computer Age Management Services", ticker: "CAMS", listed: true, sector: "finance-stocks", aliases: ["Computer Age Management"] },

  // ---- IT & software -----------------------------------------------------
  { key: "tata-consultancy-services", name: "Tata Consultancy Services", ticker: "TCS", listed: true, sector: "it-software", group: "Tata", aliases: ["Tata Consultancy", "TCS"] },
  { key: "infosys", name: "Infosys", ticker: "INFY", listed: true, sector: "it-software", aliases: ["Infosys"] },
  { key: "wipro", name: "Wipro", ticker: "WIPRO", listed: true, sector: "it-software", aliases: ["Wipro"] },
  { key: "hcl-technologies", name: "HCL Technologies", ticker: "HCLTECH", listed: true, sector: "it-software", aliases: ["HCL Technologies", "HCLTech", "HCL Tech"] },
  { key: "tech-mahindra", name: "Tech Mahindra", ticker: "TECHM", listed: true, sector: "it-software", group: "Mahindra", aliases: ["Tech Mahindra"] },
  { key: "ltimindtree", name: "LTIMindtree", ticker: "LTIM", listed: true, sector: "it-software", group: "Larsen & Toubro", aliases: ["LTIMindtree", "LTI Mindtree", "Mindtree"] },
  { key: "mphasis", name: "Mphasis", ticker: "MPHASIS", listed: true, sector: "it-software", aliases: ["Mphasis"] },
  { key: "persistent-systems", name: "Persistent Systems", ticker: "PERSISTENT", listed: true, sector: "it-software", aliases: ["Persistent Systems"] },
  { key: "coforge", name: "Coforge", ticker: "COFORGE", listed: true, sector: "it-software", aliases: ["Coforge"] },
  { key: "oracle-financial-services", name: "Oracle Financial Services", ticker: "OFSS", listed: true, sector: "it-software", aliases: ["Oracle Financial Services"] },
  { key: "tata-elxsi", name: "Tata Elxsi", ticker: "TATAELXSI", listed: true, sector: "it-software", group: "Tata", aliases: ["Tata Elxsi"] },
  { key: "kpit-technologies", name: "KPIT Technologies", ticker: "KPITTECH", listed: true, sector: "it-software", aliases: ["KPIT"] },
  { key: "cyient", name: "Cyient", ticker: "CYIENT", listed: true, sector: "it-software", aliases: ["Cyient"] },
  { key: "birlasoft", name: "Birlasoft", ticker: "BSOFT", listed: true, sector: "it-software", aliases: ["Birlasoft"] },
  { key: "happiest-minds", name: "Happiest Minds", ticker: "HAPPSTMNDS", listed: true, sector: "it-software", aliases: ["Happiest Minds"] },
  { key: "zoho", name: "Zoho", ticker: "", listed: false, sector: "it-software", aliases: ["Zoho"] },

  // ---- Oil & gas ---------------------------------------------------------
  { key: "reliance-industries", name: "Reliance Industries", ticker: "RELIANCE", listed: true, sector: "oil-gas", group: "Reliance", aliases: ["Reliance Industries", "RIL"] },
  { key: "ongc", name: "Oil and Natural Gas Corporation", ticker: "ONGC", listed: true, sector: "oil-gas", aliases: ["Oil and Natural Gas Corporation", "ONGC"] },
  { key: "indian-oil", name: "Indian Oil Corporation", ticker: "IOC", listed: true, sector: "oil-gas", aliases: ["Indian Oil", "IOCL"] },
  { key: "bharat-petroleum", name: "Bharat Petroleum", ticker: "BPCL", listed: true, sector: "oil-gas", aliases: ["Bharat Petroleum", "BPCL"] },
  { key: "hindustan-petroleum", name: "Hindustan Petroleum", ticker: "HPCL", listed: true, sector: "oil-gas", aliases: ["Hindustan Petroleum", "HPCL"] },
  { key: "gail", name: "GAIL India", ticker: "GAIL", listed: true, sector: "oil-gas", aliases: ["GAIL"] },
  { key: "oil-india", name: "Oil India", ticker: "OIL", listed: true, sector: "oil-gas", aliases: ["Oil India"] },
  { key: "petronet-lng", name: "Petronet LNG", ticker: "PETRONET", listed: true, sector: "oil-gas", aliases: ["Petronet"] },
  { key: "indraprastha-gas", name: "Indraprastha Gas", ticker: "IGL", listed: true, sector: "oil-gas", aliases: ["Indraprastha Gas"] },
  { key: "mahanagar-gas", name: "Mahanagar Gas", ticker: "MGL", listed: true, sector: "oil-gas", aliases: ["Mahanagar Gas"] },
  { key: "gujarat-gas", name: "Gujarat Gas", ticker: "GUJGASLTD", listed: true, sector: "oil-gas", aliases: ["Gujarat Gas"] },

  // ---- Power & renewables ------------------------------------------------
  { key: "ntpc", name: "NTPC", ticker: "NTPC", listed: true, sector: "renewable-energy", aliases: ["NTPC"] },
  { key: "ntpc-green-energy", name: "NTPC Green Energy", ticker: "NTPCGREEN", listed: true, sector: "renewable-energy", aliases: ["NTPC Green"] },
  { key: "power-grid-corporation", name: "Power Grid Corporation", ticker: "POWERGRID", listed: true, sector: "infrastructure", aliases: ["Power Grid Corporation", "PowerGrid"] },
  { key: "nhpc", name: "NHPC", ticker: "NHPC", listed: true, sector: "renewable-energy", aliases: ["NHPC"] },
  { key: "sjvn", name: "SJVN", ticker: "SJVN", listed: true, sector: "renewable-energy", aliases: ["SJVN"] },
  { key: "adani-green-energy", name: "Adani Green Energy", ticker: "ADANIGREEN", listed: true, sector: "renewable-energy", group: "Adani", aliases: ["Adani Green"] },
  { key: "adani-energy-solutions", name: "Adani Energy Solutions", ticker: "ADANIENSOL", listed: true, sector: "infrastructure", group: "Adani", aliases: ["Adani Energy Solutions", "Adani Transmission"] },
  { key: "adani-power", name: "Adani Power", ticker: "ADANIPOWER", listed: true, sector: "renewable-energy", group: "Adani", aliases: ["Adani Power"] },
  { key: "tata-power", name: "Tata Power", ticker: "TATAPOWER", listed: true, sector: "renewable-energy", group: "Tata", aliases: ["Tata Power"] },
  { key: "jsw-energy", name: "JSW Energy", ticker: "JSWENERGY", listed: true, sector: "renewable-energy", group: "JSW", aliases: ["JSW Energy"] },
  { key: "torrent-power", name: "Torrent Power", ticker: "TORNTPOWER", listed: true, sector: "renewable-energy", group: "Torrent", aliases: ["Torrent Power"] },
  { key: "suzlon-energy", name: "Suzlon Energy", ticker: "SUZLON", listed: true, sector: "renewable-energy", aliases: ["Suzlon"] },
  { key: "inox-wind", name: "Inox Wind", ticker: "INOXWIND", listed: true, sector: "renewable-energy", aliases: ["Inox Wind"] },
  { key: "waaree-energies", name: "Waaree Energies", ticker: "WAAREEENER", listed: true, sector: "renewable-energy", aliases: ["Waaree"] },
  { key: "premier-energies", name: "Premier Energies", ticker: "PREMIERENE", listed: true, sector: "renewable-energy", aliases: ["Premier Energies"] },
  { key: "ireda", name: "IREDA", ticker: "IREDA", listed: true, sector: "renewable-energy", aliases: ["IREDA", "Indian Renewable Energy Development Agency"] },
  { key: "sterling-and-wilson", name: "Sterling and Wilson Renewable", ticker: "SWSOLAR", listed: true, sector: "renewable-energy", aliases: ["Sterling and Wilson"] },
  { key: "acme-solar", name: "ACME Solar", ticker: "ACMESOLAR", listed: true, sector: "renewable-energy", aliases: ["ACME Solar"] },
  { key: "renew-power", name: "ReNew Energy Global", ticker: "RNW", listed: true, sector: "renewable-energy", aliases: ["ReNew Power", "ReNew Energy Global"] },
  { key: "avaada", name: "Avaada Group", ticker: "", listed: false, sector: "renewable-energy", aliases: ["Avaada"] },

  // ---- Automobiles & EV --------------------------------------------------
  { key: "maruti-suzuki", name: "Maruti Suzuki", ticker: "MARUTI", listed: true, sector: "automobiles", aliases: ["Maruti Suzuki", "Maruti"] },
  { key: "tata-motors", name: "Tata Motors", ticker: "TATAMOTORS", listed: true, sector: "automobiles", group: "Tata", aliases: ["Tata Motors"] },
  { key: "mahindra-and-mahindra", name: "Mahindra & Mahindra", ticker: "M&M", listed: true, sector: "automobiles", group: "Mahindra", aliases: ["Mahindra and Mahindra", "Mahindra & Mahindra"] },
  { key: "bajaj-auto", name: "Bajaj Auto", ticker: "BAJAJ-AUTO", listed: true, sector: "automobiles", group: "Bajaj", aliases: ["Bajaj Auto"] },
  { key: "hero-motocorp", name: "Hero MotoCorp", ticker: "HEROMOTOCO", listed: true, sector: "automobiles", aliases: ["Hero MotoCorp"] },
  { key: "tvs-motor", name: "TVS Motor", ticker: "TVSMOTOR", listed: true, sector: "automobiles", group: "TVS", aliases: ["TVS Motor"] },
  { key: "eicher-motors", name: "Eicher Motors", ticker: "EICHERMOT", listed: true, sector: "automobiles", aliases: ["Eicher Motors", "Royal Enfield"] },
  { key: "ashok-leyland", name: "Ashok Leyland", ticker: "ASHOKLEY", listed: true, sector: "automobiles", group: "Hinduja", aliases: ["Ashok Leyland"] },
  { key: "hyundai-motor-india", name: "Hyundai Motor India", ticker: "HYUNDAI", listed: true, sector: "automobiles", aliases: ["Hyundai Motor India"] },
  { key: "force-motors", name: "Force Motors", ticker: "FORCEMOT", listed: true, sector: "automobiles", aliases: ["Force Motors"] },
  { key: "ola-electric", name: "Ola Electric", ticker: "OLAELEC", listed: true, sector: "electric-vehicles", aliases: ["Ola Electric"] },
  { key: "ather-energy", name: "Ather Energy", ticker: "ATHERENERG", listed: true, sector: "electric-vehicles", aliases: ["Ather Energy"] },
  { key: "samvardhana-motherson", name: "Samvardhana Motherson", ticker: "MOTHERSON", listed: true, sector: "automobiles", aliases: ["Samvardhana Motherson", "Motherson Sumi"] },
  { key: "bharat-forge", name: "Bharat Forge", ticker: "BHARATFORG", listed: true, sector: "automobiles", group: "Kalyani", aliases: ["Bharat Forge"] },
  { key: "exide-industries", name: "Exide Industries", ticker: "EXIDEIND", listed: true, sector: "automobiles", aliases: ["Exide"] },
  { key: "amara-raja", name: "Amara Raja Energy", ticker: "ARE&M", listed: true, sector: "automobiles", aliases: ["Amara Raja"] },
  { key: "mrf", name: "MRF", ticker: "MRF", listed: true, sector: "automobiles", aliases: ["MRF"] },
  { key: "balkrishna-industries", name: "Balkrishna Industries", ticker: "BALKRISIND", listed: true, sector: "automobiles", aliases: ["Balkrishna Industries"] },
  { key: "apollo-tyres", name: "Apollo Tyres", ticker: "APOLLOTYRE", listed: true, sector: "automobiles", aliases: ["Apollo Tyres"] },
  { key: "sona-comstar", name: "Sona BLW Precision", ticker: "SONACOMS", listed: true, sector: "automobiles", aliases: ["Sona Comstar", "Sona BLW"] },
  { key: "uno-minda", name: "Uno Minda", ticker: "UNOMINDA", listed: true, sector: "automobiles", aliases: ["Uno Minda"] },
  { key: "escorts-kubota", name: "Escorts Kubota", ticker: "ESCORTS", listed: true, sector: "automobiles", aliases: ["Escorts Kubota"] },

  // ---- Pharma & healthcare -----------------------------------------------
  { key: "sun-pharmaceutical", name: "Sun Pharmaceutical", ticker: "SUNPHARMA", listed: true, sector: "pharma-healthcare", aliases: ["Sun Pharma", "Sun Pharmaceutical"] },
  { key: "dr-reddys", name: "Dr Reddy's Laboratories", ticker: "DRREDDY", listed: true, sector: "pharma-healthcare", aliases: ["Dr Reddy", "Dr Reddys"] },
  { key: "cipla", name: "Cipla", ticker: "CIPLA", listed: true, sector: "pharma-healthcare", aliases: ["Cipla"] },
  { key: "divis-laboratories", name: "Divi's Laboratories", ticker: "DIVISLAB", listed: true, sector: "pharma-healthcare", aliases: ["Divi's", "Divis Lab"] },
  { key: "lupin", name: "Lupin", ticker: "LUPIN", listed: true, sector: "pharma-healthcare", aliases: ["Lupin"] },
  { key: "aurobindo-pharma", name: "Aurobindo Pharma", ticker: "AUROPHARMA", listed: true, sector: "pharma-healthcare", aliases: ["Aurobindo"] },
  { key: "zydus-lifesciences", name: "Zydus Lifesciences", ticker: "ZYDUSLIFE", listed: true, sector: "pharma-healthcare", aliases: ["Zydus"] },
  { key: "torrent-pharmaceuticals", name: "Torrent Pharmaceuticals", ticker: "TORNTPHARM", listed: true, sector: "pharma-healthcare", group: "Torrent", aliases: ["Torrent Pharma", "Torrent Pharmaceuticals"] },
  { key: "alkem-laboratories", name: "Alkem Laboratories", ticker: "ALKEM", listed: true, sector: "pharma-healthcare", aliases: ["Alkem"] },
  { key: "mankind-pharma", name: "Mankind Pharma", ticker: "MANKIND", listed: true, sector: "pharma-healthcare", aliases: ["Mankind Pharma"] },
  { key: "glenmark", name: "Glenmark Pharmaceuticals", ticker: "GLENMARK", listed: true, sector: "pharma-healthcare", aliases: ["Glenmark"] },
  { key: "biocon", name: "Biocon", ticker: "BIOCON", listed: true, sector: "pharma-healthcare", aliases: ["Biocon"] },
  { key: "ipca-laboratories", name: "Ipca Laboratories", ticker: "IPCALAB", listed: true, sector: "pharma-healthcare", aliases: ["Ipca"] },
  { key: "apollo-hospitals", name: "Apollo Hospitals", ticker: "APOLLOHOSP", listed: true, sector: "pharma-healthcare", aliases: ["Apollo Hospitals"] },
  { key: "fortis-healthcare", name: "Fortis Healthcare", ticker: "FORTIS", listed: true, sector: "pharma-healthcare", aliases: ["Fortis Healthcare"] },
  { key: "max-healthcare", name: "Max Healthcare", ticker: "MAXHEALTH", listed: true, sector: "pharma-healthcare", aliases: ["Max Healthcare"] },
  { key: "dr-lal-pathlabs", name: "Dr Lal PathLabs", ticker: "LALPATHLAB", listed: true, sector: "pharma-healthcare", aliases: ["Dr Lal PathLabs"] },
  { key: "metropolis-healthcare", name: "Metropolis Healthcare", ticker: "METROPOLIS", listed: true, sector: "pharma-healthcare", aliases: ["Metropolis Healthcare"] },
  { key: "serum-institute", name: "Serum Institute of India", ticker: "", listed: false, sector: "pharma-healthcare", aliases: ["Serum Institute"] },
  { key: "bharat-biotech", name: "Bharat Biotech", ticker: "", listed: false, sector: "pharma-healthcare", aliases: ["Bharat Biotech"] },

  // ---- Food & FMCG -------------------------------------------------------
  { key: "hindustan-unilever", name: "Hindustan Unilever", ticker: "HINDUNILVR", listed: true, sector: "food-fmcg", aliases: ["Hindustan Unilever", "HUL"] },
  // "ITC" on its own is input tax credit far more often than it is the company.
  { key: "itc", name: "ITC Limited", ticker: "ITC", listed: true, sector: "food-fmcg", aliases: ["ITC Limited", "ITC Ltd", "ITC Hotels"] },
  { key: "nestle-india", name: "Nestlé India", ticker: "NESTLEIND", listed: true, sector: "food-fmcg", aliases: ["Nestle India"] },
  { key: "britannia", name: "Britannia Industries", ticker: "BRITANNIA", listed: true, sector: "food-fmcg", aliases: ["Britannia"] },
  { key: "dabur", name: "Dabur India", ticker: "DABUR", listed: true, sector: "food-fmcg", aliases: ["Dabur"] },
  { key: "marico", name: "Marico", ticker: "MARICO", listed: true, sector: "food-fmcg", aliases: ["Marico"] },
  { key: "godrej-consumer", name: "Godrej Consumer Products", ticker: "GODREJCP", listed: true, sector: "food-fmcg", group: "Godrej", aliases: ["Godrej Consumer"] },
  { key: "colgate-palmolive-india", name: "Colgate-Palmolive India", ticker: "COLPAL", listed: true, sector: "food-fmcg", aliases: ["Colgate Palmolive"] },
  { key: "tata-consumer-products", name: "Tata Consumer Products", ticker: "TATACONSUM", listed: true, sector: "food-fmcg", group: "Tata", aliases: ["Tata Consumer"] },
  { key: "varun-beverages", name: "Varun Beverages", ticker: "VBL", listed: true, sector: "food-fmcg", aliases: ["Varun Beverages"] },
  { key: "adani-wilmar", name: "AWL Agri Business", ticker: "AWL", listed: true, sector: "food-fmcg", group: "Adani", aliases: ["Adani Wilmar", "AWL Agri"] },
  { key: "patanjali-foods", name: "Patanjali Foods", ticker: "PATANJALI", listed: true, sector: "food-fmcg", aliases: ["Patanjali"] },
  { key: "emami", name: "Emami", ticker: "EMAMILTD", listed: true, sector: "food-fmcg", aliases: ["Emami"] },
  { key: "honasa-consumer", name: "Honasa Consumer", ticker: "HONASA", listed: true, sector: "food-fmcg", aliases: ["Honasa", "Mamaearth"] },
  { key: "united-spirits", name: "United Spirits", ticker: "MCDOWELL-N", listed: true, sector: "food-fmcg", aliases: ["United Spirits"] },
  { key: "united-breweries", name: "United Breweries", ticker: "UBL", listed: true, sector: "food-fmcg", aliases: ["United Breweries"] },
  { key: "radico-khaitan", name: "Radico Khaitan", ticker: "RADICO", listed: true, sector: "food-fmcg", aliases: ["Radico Khaitan"] },
  { key: "amul", name: "Amul (GCMMF)", ticker: "", listed: false, sector: "food-fmcg", aliases: ["Amul"] },

  // ---- Telecom -----------------------------------------------------------
  { key: "bharti-airtel", name: "Bharti Airtel", ticker: "BHARTIARTL", listed: true, sector: "telecom", group: "Bharti", aliases: ["Bharti Airtel", "Airtel"] },
  { key: "vodafone-idea", name: "Vodafone Idea", ticker: "IDEA", listed: true, sector: "telecom", aliases: ["Vodafone Idea"] },
  { key: "reliance-jio", name: "Reliance Jio", ticker: "", listed: false, sector: "telecom", group: "Reliance", aliases: ["Reliance Jio", "Jio"] },
  { key: "bsnl", name: "BSNL", ticker: "", listed: false, sector: "telecom", aliases: ["BSNL"] },
  { key: "indus-towers", name: "Indus Towers", ticker: "INDUSTOWER", listed: true, sector: "telecom", aliases: ["Indus Towers"] },
  { key: "tata-communications", name: "Tata Communications", ticker: "TATACOMM", listed: true, sector: "telecom", group: "Tata", aliases: ["Tata Communications"] },
  { key: "hfcl", name: "HFCL", ticker: "HFCL", listed: true, sector: "telecom", aliases: ["HFCL"] },
  { key: "tejas-networks", name: "Tejas Networks", ticker: "TEJASNET", listed: true, sector: "telecom", group: "Tata", aliases: ["Tejas Networks"] },
  { key: "sterlite-technologies", name: "Sterlite Technologies", ticker: "STLTECH", listed: true, sector: "telecom", group: "Vedanta", aliases: ["Sterlite Technologies"] },

  // ---- Steel, metals & mining --------------------------------------------
  { key: "tata-steel", name: "Tata Steel", ticker: "TATASTEEL", listed: true, sector: "steel-mining", group: "Tata", aliases: ["Tata Steel"] },
  { key: "jsw-steel", name: "JSW Steel", ticker: "JSWSTEEL", listed: true, sector: "steel-mining", group: "JSW", aliases: ["JSW Steel"] },
  // "SAIL" is also a verb; only the long form is safe.
  { key: "steel-authority-of-india", name: "Steel Authority of India", ticker: "SAIL", listed: true, sector: "steel-mining", aliases: ["Steel Authority"] },
  { key: "jindal-steel", name: "Jindal Steel & Power", ticker: "JINDALSTEL", listed: true, sector: "steel-mining", group: "Jindal", aliases: ["Jindal Steel"] },
  { key: "hindalco", name: "Hindalco Industries", ticker: "HINDALCO", listed: true, sector: "steel-mining", group: "Aditya Birla", aliases: ["Hindalco"] },
  { key: "vedanta", name: "Vedanta Limited", ticker: "VEDL", listed: true, sector: "steel-mining", group: "Vedanta", aliases: ["Vedanta"] },
  { key: "hindustan-zinc", name: "Hindustan Zinc", ticker: "HINDZINC", listed: true, sector: "steel-mining", group: "Vedanta", aliases: ["Hindustan Zinc"] },
  { key: "nmdc", name: "NMDC", ticker: "NMDC", listed: true, sector: "steel-mining", aliases: ["NMDC"] },
  { key: "coal-india", name: "Coal India", ticker: "COALINDIA", listed: true, sector: "steel-mining", aliases: ["Coal India"] },
  { key: "national-aluminium", name: "National Aluminium", ticker: "NATIONALUM", listed: true, sector: "steel-mining", aliases: ["National Aluminium", "NALCO"] },
  { key: "apl-apollo", name: "APL Apollo Tubes", ticker: "APLAPOLLO", listed: true, sector: "steel-mining", aliases: ["APL Apollo"] },

  // ---- Infrastructure, cement & construction -----------------------------
  { key: "larsen-and-toubro", name: "Larsen & Toubro", ticker: "LT", listed: true, sector: "infrastructure", group: "Larsen & Toubro", aliases: ["Larsen and Toubro", "Larsen & Toubro", "L&T"] },
  { key: "ultratech-cement", name: "UltraTech Cement", ticker: "ULTRACEMCO", listed: true, sector: "infrastructure", group: "Aditya Birla", aliases: ["UltraTech"] },
  { key: "ambuja-cements", name: "Ambuja Cements", ticker: "AMBUJACEM", listed: true, sector: "infrastructure", group: "Adani", aliases: ["Ambuja Cement", "Ambuja Cements"] },
  { key: "acc", name: "ACC Limited", ticker: "ACC", listed: true, sector: "infrastructure", group: "Adani", aliases: ["ACC Limited"] },
  { key: "shree-cement", name: "Shree Cement", ticker: "SHREECEM", listed: true, sector: "infrastructure", aliases: ["Shree Cement"] },
  { key: "dalmia-bharat", name: "Dalmia Bharat", ticker: "DALBHARAT", listed: true, sector: "infrastructure", aliases: ["Dalmia Bharat"] },
  { key: "jk-cement", name: "JK Cement", ticker: "JKCEMENT", listed: true, sector: "infrastructure", aliases: ["JK Cement"] },
  { key: "grasim", name: "Grasim Industries", ticker: "GRASIM", listed: true, sector: "manufacturing", group: "Aditya Birla", aliases: ["Grasim"] },
  { key: "nbcc", name: "NBCC India", ticker: "NBCC", listed: true, sector: "infrastructure", aliases: ["NBCC"] },
  { key: "ircon", name: "Ircon International", ticker: "IRCON", listed: true, sector: "infrastructure", aliases: ["Ircon"] },
  { key: "rail-vikas-nigam", name: "Rail Vikas Nigam", ticker: "RVNL", listed: true, sector: "infrastructure", aliases: ["Rail Vikas Nigam", "RVNL"] },
  { key: "irfc", name: "Indian Railway Finance Corporation", ticker: "IRFC", listed: true, sector: "infrastructure", aliases: ["Indian Railway Finance", "IRFC"] },
  { key: "irctc", name: "IRCTC", ticker: "IRCTC", listed: true, sector: "infrastructure", aliases: ["IRCTC"] },
  { key: "gmr-airports", name: "GMR Airports", ticker: "GMRAIRPORT", listed: true, sector: "infrastructure", group: "GMR", aliases: ["GMR Airports", "GMR Infrastructure"] },

  // ---- Ports, shipping & logistics ---------------------------------------
  { key: "adani-ports", name: "Adani Ports & SEZ", ticker: "ADANIPORTS", listed: true, sector: "ports-shipping", group: "Adani", aliases: ["Adani Ports"] },
  { key: "jsw-infrastructure", name: "JSW Infrastructure", ticker: "JSWINFRA", listed: true, sector: "ports-shipping", group: "JSW", aliases: ["JSW Infrastructure"] },
  { key: "shipping-corporation-of-india", name: "Shipping Corporation of India", ticker: "SCI", listed: true, sector: "ports-shipping", aliases: ["Shipping Corporation of India"] },
  { key: "cochin-shipyard", name: "Cochin Shipyard", ticker: "COCHINSHIP", listed: true, sector: "ports-shipping", aliases: ["Cochin Shipyard"] },
  { key: "container-corporation", name: "Container Corporation of India", ticker: "CONCOR", listed: true, sector: "logistics", aliases: ["Container Corporation", "CONCOR"] },
  { key: "delhivery", name: "Delhivery", ticker: "DELHIVERY", listed: true, sector: "logistics", aliases: ["Delhivery"] },
  { key: "blue-dart", name: "Blue Dart Express", ticker: "BLUEDART", listed: true, sector: "logistics", aliases: ["Blue Dart"] },
  // "IndiGo" alone is a colour and a hotel chain; the airline needs its long forms.
  { key: "interglobe-aviation", name: "InterGlobe Aviation (IndiGo)", ticker: "INDIGO", listed: true, sector: "logistics", aliases: ["InterGlobe Aviation", "IndiGo Airlines"] },
  { key: "spicejet", name: "SpiceJet", ticker: "SPICEJET", listed: true, sector: "logistics", aliases: ["SpiceJet"] },
  { key: "air-india", name: "Air India", ticker: "", listed: false, sector: "logistics", group: "Tata", aliases: ["Air India"] },
  { key: "akasa-air", name: "Akasa Air", ticker: "", listed: false, sector: "logistics", aliases: ["Akasa Air"] },

  // ---- Defence & space ---------------------------------------------------
  { key: "hindustan-aeronautics", name: "Hindustan Aeronautics", ticker: "HAL", listed: true, sector: "defence", aliases: ["Hindustan Aeronautics", "HAL"] },
  { key: "bharat-electronics", name: "Bharat Electronics", ticker: "BEL", listed: true, sector: "defence", aliases: ["Bharat Electronics"] },
  { key: "bharat-dynamics", name: "Bharat Dynamics", ticker: "BDL", listed: true, sector: "defence", aliases: ["Bharat Dynamics"] },
  { key: "beml", name: "BEML", ticker: "BEML", listed: true, sector: "defence", aliases: ["BEML"] },
  { key: "mazagon-dock", name: "Mazagon Dock Shipbuilders", ticker: "MAZDOCK", listed: true, sector: "defence", aliases: ["Mazagon Dock"] },
  { key: "garden-reach-shipbuilders", name: "Garden Reach Shipbuilders", ticker: "GRSE", listed: true, sector: "defence", aliases: ["Garden Reach Shipbuilders", "GRSE"] },
  { key: "solar-industries", name: "Solar Industries India", ticker: "SOLARINDS", listed: true, sector: "defence", aliases: ["Solar Industries"] },
  { key: "data-patterns", name: "Data Patterns", ticker: "DATAPATTNS", listed: true, sector: "defence", aliases: ["Data Patterns"] },
  { key: "paras-defence", name: "Paras Defence", ticker: "PARAS", listed: true, sector: "defence", aliases: ["Paras Defence"] },
  { key: "ideaforge", name: "ideaForge Technology", ticker: "IDEAFORGE", listed: true, sector: "defence", aliases: ["ideaForge"] },
  { key: "newspace-india", name: "NewSpace India Limited", ticker: "", listed: false, sector: "space", aliases: ["NewSpace India", "NSIL"] },
  { key: "skyroot-aerospace", name: "Skyroot Aerospace", ticker: "", listed: false, sector: "space", aliases: ["Skyroot"] },
  { key: "agnikul-cosmos", name: "Agnikul Cosmos", ticker: "", listed: false, sector: "space", aliases: ["Agnikul"] },
  { key: "pixxel", name: "Pixxel", ticker: "", listed: false, sector: "space", aliases: ["Pixxel"] },
  { key: "dhruva-space", name: "Dhruva Space", ticker: "", listed: false, sector: "space", aliases: ["Dhruva Space"] },

  // ---- Electronics & semiconductors --------------------------------------
  { key: "tata-electronics", name: "Tata Electronics", ticker: "", listed: false, sector: "semiconductors", group: "Tata", aliases: ["Tata Electronics"] },
  { key: "cg-power", name: "CG Power & Industrial", ticker: "CGPOWER", listed: true, sector: "semiconductors", group: "Murugappa", aliases: ["CG Power"] },
  { key: "kaynes-technology", name: "Kaynes Technology", ticker: "KAYNES", listed: true, sector: "semiconductors", aliases: ["Kaynes"] },
  { key: "dixon-technologies", name: "Dixon Technologies", ticker: "DIXON", listed: true, sector: "manufacturing", aliases: ["Dixon Technologies"] },
  { key: "amber-enterprises", name: "Amber Enterprises", ticker: "AMBER", listed: true, sector: "manufacturing", aliases: ["Amber Enterprises"] },
  { key: "syrma-sgs", name: "Syrma SGS Technology", ticker: "SYRMA", listed: true, sector: "semiconductors", aliases: ["Syrma"] },
  { key: "micron-india", name: "Micron Technology (India)", ticker: "", listed: false, sector: "semiconductors", aliases: ["Micron"] },

  // ---- Fintech, consumer internet & large private companies --------------
  { key: "paytm", name: "Paytm (One97)", ticker: "PAYTM", listed: true, sector: "fintech", aliases: ["Paytm", "One97 Communications"] },
  { key: "pb-fintech", name: "PB Fintech (Policybazaar)", ticker: "POLICYBZR", listed: true, sector: "fintech", aliases: ["PB Fintech", "Policybazaar"] },
  { key: "eternal", name: "Eternal (Zomato)", ticker: "ETERNAL", listed: true, sector: "startups-vc", aliases: ["Zomato", "Eternal Limited", "Blinkit"] },
  { key: "swiggy", name: "Swiggy", ticker: "SWIGGY", listed: true, sector: "startups-vc", aliases: ["Swiggy", "Instamart"] },
  { key: "nykaa", name: "Nykaa (FSN E-Commerce)", ticker: "NYKAA", listed: true, sector: "startups-vc", aliases: ["Nykaa", "FSN E-Commerce"] },
  { key: "mobikwik", name: "MobiKwik", ticker: "MOBIKWIK", listed: true, sector: "fintech", aliases: ["MobiKwik"] },
  { key: "ixigo", name: "ixigo (Le Travenues)", ticker: "IXIGO", listed: true, sector: "startups-vc", aliases: ["ixigo"] },
  { key: "firstcry", name: "FirstCry (Brainbees)", ticker: "FIRSTCRY", listed: true, sector: "startups-vc", aliases: ["FirstCry", "Brainbees"] },
  { key: "phonepe", name: "PhonePe", ticker: "", listed: false, sector: "fintech", aliases: ["PhonePe"] },
  { key: "razorpay", name: "Razorpay", ticker: "", listed: false, sector: "fintech", aliases: ["Razorpay"] },
  { key: "groww", name: "Groww (Billionbrains)", ticker: "GROWW", listed: true, sector: "fintech", aliases: ["Groww"] },
  { key: "zerodha", name: "Zerodha", ticker: "", listed: false, sector: "fintech", aliases: ["Zerodha"] },
  { key: "pine-labs", name: "Pine Labs", ticker: "", listed: false, sector: "fintech", aliases: ["Pine Labs"] },
  { key: "flipkart", name: "Flipkart", ticker: "", listed: false, sector: "startups-vc", aliases: ["Flipkart"] },
  { key: "meesho", name: "Meesho", ticker: "", listed: false, sector: "startups-vc", aliases: ["Meesho"] },
  { key: "zepto", name: "Zepto", ticker: "", listed: false, sector: "startups-vc", aliases: ["Zepto"] },
  { key: "lenskart", name: "Lenskart", ticker: "", listed: false, sector: "startups-vc", aliases: ["Lenskart"] },
  { key: "oyo", name: "OYO (Oravel Stays)", ticker: "", listed: false, sector: "startups-vc", aliases: ["OYO", "Oravel Stays"] },
  { key: "byjus", name: "BYJU'S (Think & Learn)", ticker: "", listed: false, sector: "startups-vc", aliases: ["BYJU'S", "Byjus"] },
  { key: "dream11", name: "Dream11 (Dream Sports)", ticker: "", listed: false, sector: "startups-vc", aliases: ["Dream11", "Dream Sports"] },
  { key: "udaan", name: "Udaan", ticker: "", listed: false, sector: "startups-vc", aliases: ["Udaan"] },
  { key: "physicswallah", name: "PhysicsWallah", ticker: "PHYSICSWAL", listed: true, sector: "startups-vc", aliases: ["PhysicsWallah", "Physics Wallah"] },
  { key: "unacademy", name: "Unacademy", ticker: "", listed: false, sector: "startups-vc", aliases: ["Unacademy"] },
  { key: "urban-company", name: "Urban Company", ticker: "URBANCO", listed: true, sector: "startups-vc", aliases: ["Urban Company"] },
  { key: "ola-consumer", name: "Ola Consumer (ANI Technologies)", ticker: "", listed: false, sector: "startups-vc", aliases: ["Ola Cabs", "ANI Technologies"] },

  // ---- Real estate -------------------------------------------------------
  { key: "dlf", name: "DLF", ticker: "DLF", listed: true, sector: "real-estate", aliases: ["DLF"] },
  { key: "godrej-properties", name: "Godrej Properties", ticker: "GODREJPROP", listed: true, sector: "real-estate", group: "Godrej", aliases: ["Godrej Properties"] },
  { key: "macrotech-developers", name: "Macrotech Developers (Lodha)", ticker: "LODHA", listed: true, sector: "real-estate", aliases: ["Macrotech", "Lodha Developers"] },
  { key: "oberoi-realty", name: "Oberoi Realty", ticker: "OBEROIRLTY", listed: true, sector: "real-estate", aliases: ["Oberoi Realty"] },
  { key: "prestige-estates", name: "Prestige Estates", ticker: "PRESTIGE", listed: true, sector: "real-estate", aliases: ["Prestige Estates"] },
  { key: "brigade-enterprises", name: "Brigade Enterprises", ticker: "BRIGADE", listed: true, sector: "real-estate", aliases: ["Brigade Enterprises"] },
  { key: "phoenix-mills", name: "Phoenix Mills", ticker: "PHOENIXLTD", listed: true, sector: "real-estate", aliases: ["Phoenix Mills"] },

  // ---- Textiles & apparel ------------------------------------------------
  { key: "arvind", name: "Arvind Limited", ticker: "ARVIND", listed: true, sector: "textiles", aliases: ["Arvind Limited"] },
  { key: "welspun-living", name: "Welspun Living", ticker: "WELSPUNLIV", listed: true, sector: "textiles", group: "Welspun", aliases: ["Welspun Living"] },
  { key: "trident", name: "Trident Limited", ticker: "TRIDENT", listed: true, sector: "textiles", aliases: ["Trident Limited"] },
  { key: "vardhman-textiles", name: "Vardhman Textiles", ticker: "VTL", listed: true, sector: "textiles", aliases: ["Vardhman Textiles"] },
  { key: "page-industries", name: "Page Industries", ticker: "PAGEIND", listed: true, sector: "textiles", aliases: ["Page Industries"] },
  { key: "raymond", name: "Raymond", ticker: "RAYMOND", listed: true, sector: "textiles", aliases: ["Raymond"] },
  { key: "aditya-birla-fashion", name: "Aditya Birla Fashion & Retail", ticker: "ABFRL", listed: true, sector: "textiles", group: "Aditya Birla", aliases: ["Aditya Birla Fashion", "ABFRL"] },
  { key: "trent", name: "Trent (Westside)", ticker: "TRENT", listed: true, sector: "textiles", group: "Tata", aliases: ["Trent Limited", "Westside"] },

  // ---- Agriculture & agri-inputs -----------------------------------------
  { key: "upl", name: "UPL Limited", ticker: "UPL", listed: true, sector: "agriculture", aliases: ["UPL Limited"] },
  { key: "coromandel-international", name: "Coromandel International", ticker: "COROMANDEL", listed: true, sector: "agriculture", group: "Murugappa", aliases: ["Coromandel International"] },
  { key: "chambal-fertilisers", name: "Chambal Fertilisers", ticker: "CHAMBLFERT", listed: true, sector: "agriculture", aliases: ["Chambal Fertilisers"] },
  { key: "rashtriya-chemicals", name: "Rashtriya Chemicals & Fertilizers", ticker: "RCF", listed: true, sector: "agriculture", aliases: ["Rashtriya Chemicals"] },
  { key: "national-fertilizers", name: "National Fertilizers", ticker: "NFL", listed: true, sector: "agriculture", aliases: ["National Fertilizers"] },
  { key: "pi-industries", name: "PI Industries", ticker: "PIIND", listed: true, sector: "agriculture", aliases: ["PI Industries"] },
  { key: "godrej-agrovet", name: "Godrej Agrovet", ticker: "GODREJAGRO", listed: true, sector: "agriculture", group: "Godrej", aliases: ["Godrej Agrovet"] },
  { key: "dhanuka-agritech", name: "Dhanuka Agritech", ticker: "DHANUKA", listed: true, sector: "agriculture", aliases: ["Dhanuka"] },
  { key: "ninjacart", name: "Ninjacart", ticker: "", listed: false, sector: "agriculture", aliases: ["Ninjacart"] },
  { key: "dehaat", name: "DeHaat", ticker: "", listed: false, sector: "agriculture", aliases: ["DeHaat"] },

  // ---- Diversified manufacturing & capital goods -------------------------
  { key: "adani-enterprises", name: "Adani Enterprises", ticker: "ADANIENT", listed: true, sector: "manufacturing", group: "Adani", aliases: ["Adani Enterprises"] },
  { key: "tata-sons", name: "Tata Sons", ticker: "", listed: false, sector: "manufacturing", group: "Tata", aliases: ["Tata Sons"] },
  { key: "siemens-india", name: "Siemens India", ticker: "SIEMENS", listed: true, sector: "manufacturing", aliases: ["Siemens"] },
  { key: "abb-india", name: "ABB India", ticker: "ABB", listed: true, sector: "manufacturing", aliases: ["ABB India"] },
  { key: "havells", name: "Havells India", ticker: "HAVELLS", listed: true, sector: "manufacturing", aliases: ["Havells"] },
  { key: "voltas", name: "Voltas", ticker: "VOLTAS", listed: true, sector: "manufacturing", group: "Tata", aliases: ["Voltas"] },
  { key: "blue-star", name: "Blue Star", ticker: "BLUESTARCO", listed: true, sector: "manufacturing", aliases: ["Blue Star"] },
  { key: "crompton-greaves-consumer", name: "Crompton Greaves Consumer", ticker: "CROMPTON", listed: true, sector: "manufacturing", aliases: ["Crompton Greaves"] },
  { key: "polycab", name: "Polycab India", ticker: "POLYCAB", listed: true, sector: "manufacturing", aliases: ["Polycab"] },
  { key: "kei-industries", name: "KEI Industries", ticker: "KEI", listed: true, sector: "manufacturing", aliases: ["KEI Industries"] },
  { key: "thermax", name: "Thermax", ticker: "THERMAX", listed: true, sector: "manufacturing", aliases: ["Thermax"] },
  { key: "cummins-india", name: "Cummins India", ticker: "CUMMINSIND", listed: true, sector: "manufacturing", aliases: ["Cummins India"] },
  { key: "bhel", name: "Bharat Heavy Electricals", ticker: "BHEL", listed: true, sector: "manufacturing", aliases: ["Bharat Heavy Electricals", "BHEL"] },
  { key: "titan-company", name: "Titan Company", ticker: "TITAN", listed: true, sector: "manufacturing", group: "Tata", aliases: ["Titan Company", "Tanishq"] },
  { key: "asian-paints", name: "Asian Paints", ticker: "ASIANPAINT", listed: true, sector: "manufacturing", aliases: ["Asian Paints"] },
  { key: "berger-paints", name: "Berger Paints", ticker: "BERGEPAINT", listed: true, sector: "manufacturing", aliases: ["Berger Paints"] },
  { key: "pidilite", name: "Pidilite Industries", ticker: "PIDILITIND", listed: true, sector: "manufacturing", aliases: ["Pidilite"] },
  { key: "srf", name: "SRF Limited", ticker: "SRF", listed: true, sector: "manufacturing", aliases: ["SRF Limited"] },
  { key: "aarti-industries", name: "Aarti Industries", ticker: "AARTIIND", listed: true, sector: "manufacturing", aliases: ["Aarti Industries"] },
  { key: "deepak-nitrite", name: "Deepak Nitrite", ticker: "DEEPAKNTR", listed: true, sector: "manufacturing", aliases: ["Deepak Nitrite"] },
  { key: "tata-chemicals", name: "Tata Chemicals", ticker: "TATACHEM", listed: true, sector: "manufacturing", group: "Tata", aliases: ["Tata Chemicals"] },
];

/**
 * Punctuation that ends a phrase rather than sitting inside one.
 *
 * Collapsing *all* punctuation to spaces is what lets "ONGC's" and "L&T"
 * match, and it is also what invents adjacencies that were never in the text:
 * "crude oil, India's imports" becomes "crude oil india", which is Oil India,
 * and "Beyond Oil: India and Saudi Arabia" becomes the same thing. Commas,
 * colons, semicolons, brackets, quotes and the long dashes are therefore
 * turned into a barrier no multi-word alias can cross.
 *
 * The full stop is deliberately **not** a barrier, and neither are ampersands,
 * hyphens or slashes: "Dr. Reddy's", "Reliance Industries Ltd. said", "L&T"
 * and "Colgate-Palmolive" all need an alias to bridge one, and inside a
 * headline an abbreviating full stop is far more common than a sentence
 * boundary. Apostrophes *are* barriers, which costs nothing because aliases
 * run through this same function - "Divi's" is normalised on both sides.
 */
const BARRIER = /[,;:()[\]{}"'“”‘’«»|–—]+/g;

/**
 * Everything down to alphanumerics separated by single spaces, padded so that
 * `includes(" hal ")` is a whole-word test, with phrase barriers preserved.
 *
 * This is the one meaningful difference from `categorize()`'s matcher, and the
 * module note above says why: company names are short, punctuated and often
 * initialisms, and a plain substring test fails badly on both counts.
 */
function normalize(text: string): string {
  const marked = text.toLowerCase().replace(BARRIER, " | ");
  const words = marked.replace(/[^a-z0-9|]+/g, " ").replace(/\s+/g, " ").trim();
  return ` ${words} `;
}

/**
 * Longer institution names that *contain* a company alias without being that
 * company.
 *
 * The positional suppression below can only ever be as good as the set of
 * names it knows about, and it knows about companies. "Reserve Bank of India"
 * is not a company, so nothing stopped every RBI circular in the archive from
 * being filed as a Bank of India story - which, in an archive whose single
 * largest publisher is the RBI, was the biggest false positive in the whole
 * dictionary.
 *
 * These take part in suppression exactly as a company would, and are never
 * themselves returned. Keep the list to phrases that genuinely swallow an
 * alias; it is not a place for general stopwords.
 */
const DECOYS = [
  "Reserve Bank of India",
  "Export-Import Bank of India",
  "Small Industries Development Bank of India",
  "Industrial Development Bank of India",
  "National Housing Bank of India",
];

const DECOY_NEEDLES = DECOYS.map(normalize);

/** Aliases normalised once at module load rather than per article. */
const MATCHERS: { key: string; needles: string[] }[] = COMPANIES.map((company) => ({
  key: company.key,
  needles: [...new Set(company.aliases.map(normalize))],
}));

/** Every position a needle occurs at, as half-open ranges over the haystack. */
function occurrences(haystack: string, needle: string): [number, number][] {
  const found: [number, number][] = [];
  // Overlapping matches are irrelevant here (no alias is a prefix of itself)
  // but stepping by one keeps this correct if one ever is.
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    found.push([at, at + needle.length]);
  }
  return found;
}

/**
 * Which companies a story names.
 *
 * Returns every match, in dictionary order, so the result is stable for a
 * given headline - the value is written to a database column, and an unstable
 * order would make every re-run look like a change.
 *
 * ## Why the second pass exists
 *
 * Whole-word padding is not enough on its own, because several Indian company
 * names are *contained in* other company names: " bank of india " sits inside
 * " state bank of india ", " central bank of india " and " union bank of india
 * ", and " icici " sits inside " icici prudential ". Matching alone therefore
 * tagged every SBI story as a Bank of India story too - a false positive of
 * exactly the kind this dictionary exists to avoid, and one that whole-word
 * boundaries cannot see, because both matches genuinely are whole words.
 *
 * So matches are collected positionally, and a company is kept only if at
 * least one of its occurrences is not swallowed by a *longer* occurrence
 * belonging to a different company. The comparison is by position rather than
 * by string, which is what preserves the case that matters: a story that
 * mentions Bank of India somewhere other than inside "State Bank of India"
 * still tags both.
 */
export function detectEntities(title: string, excerpt: string): string[] {
  const haystack = normalize(`${title} ${excerpt}`);

  const hits = MATCHERS.flatMap(({ key, needles }) => {
    const ranges = needles.flatMap((needle) => occurrences(haystack, needle));
    return ranges.length > 0 ? [{ key, ranges }] : [];
  });
  if (hits.length === 0) return [];

  // Decoys join the range set under a key no company can hold, so they can
  // suppress a match without ever being reported as one.
  const all = [
    ...hits.flatMap(({ key, ranges }) => ranges.map(([start, end]) => ({ key, start, end }))),
    ...DECOY_NEEDLES.flatMap((needle) =>
      occurrences(haystack, needle).map(([start, end]) => ({ key: "", start, end }))
    ),
  ];

  return hits
    .filter(({ key, ranges }) =>
      ranges.some(
        ([start, end]) =>
          !all.some(
            (other) =>
              other.key !== key &&
              other.end - other.start > end - start &&
              other.start <= start &&
              other.end >= end
          )
      )
    )
    .map((hit) => hit.key);
}

const BY_KEY = new Map(COMPANIES.map((company) => [company.key, company]));

export function companyByKey(key: string): Company | undefined {
  return BY_KEY.get(key);
}

/** Display name for a stored key, falling back for anything since removed. */
export function companyName(key: string): string {
  return BY_KEY.get(key)?.name ?? key;
}

/** Every promoter group in the dictionary, with its companies, largest first. */
export function companyGroups(): { group: string; companies: Company[] }[] {
  const groups = new Map<string, Company[]>();
  for (const company of COMPANIES) {
    if (!company.group) continue;
    const list = groups.get(company.group) ?? [];
    list.push(company);
    groups.set(company.group, list);
  }
  return [...groups]
    .map(([group, companies]) => ({ group, companies }))
    .sort((a, b) => b.companies.length - a.companies.length || a.group.localeCompare(b.group));
}

/** The companies this dictionary files under one sector tag. */
export function companiesInSector(sector: string): Company[] {
  return COMPANIES.filter((company) => company.sector === sector);
}
