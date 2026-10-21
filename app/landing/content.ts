/**
 * Static landing-page copy, transcribed verbatim from
 * `Grafeat prototype.zip` → `Landing Page.dc.html`'s `renderVals()`.
 * This is the final export's wording — do not edit for style.
 */

export interface RitualStep {
  n: number;
  step: string;
  how: string;
  auto: boolean;
  you: boolean;
}

const RITUAL_SOURCE: Array<[string, string, 0 | 1]> = [
  ["Find submissions", "Collected from posts that @mention your account", 1],
  ["Check eligibility", "Every post checked against your rules, with the reason shown", 1],
  ["Sort by day", "Matched to Day 01–31 by date and daily hashtag", 1],
  ["Review", "A calm gallery of only the eligible work", 0],
  ["Shortlist", "Tap to pick, up to 10 for one carousel", 0],
  ["Verify finalists", "Once per creator, remembered for the whole challenge", 0],
  ["Order selections", "Drag the running order", 0],
  ["Credit creators", "Numbered credits written in slide order", 1],
  ["Compose feature", "Caption from your template; Reel audio removed if you want", 1],
  ["Publish", "One button, or scheduled for later", 0],
];

export const ritual: RitualStep[] = RITUAL_SOURCE.map(([step, how, auto], i) => ({
  n: i + 1,
  step,
  how,
  auto: !!auto,
  you: !auto,
}));

export interface Pillar {
  k: string;
  title: string;
  body: string;
}

export const pillars: Pillar[] = [
  {
    k: "Rules",
    title: "It knows what counts for today.",
    body: "Mention, challenge hashtag, daily hashtag and posting window are checked for every post. Posts that miss a rule are set aside automatically, with the reason. Following the rules is the participant's job, so there's no queue for you to clear.",
  },
  {
    k: "Credits",
    title: "Reorder the slides, the credits follow.",
    body: "The caption's numbered list of artists is tied to the carousel. Move slide 4 to the front and @handle number 4 becomes number 1. Everything else in the caption stays yours to write.",
  },
  {
    k: "Followers",
    title: "Verify a creator once.",
    body: "Instagram doesn't share who follows you, so nothing pretends to. Open a finalist's profile, mark them verified, and they stay verified for the rest of the challenge.",
  },
  {
    k: "Reels",
    title: "Reels without the music.",
    body: "Featured Reels can be republished without their original audio. Set the default once per challenge and change it per Reel.",
  },
];

export interface CarryItem {
  a: string;
  b: string;
}

export const carry: CarryItem[] = [
  { a: "Submission rules", b: "mention, hashtags, media, window" },
  { a: "Hashtag templates", b: "#{name}{yyyy}_day{dd}" },
  { a: "Caption template", b: "with credits and hashtags" },
  { a: "Selection and publishing defaults", b: "max 10, manual check, audio" },
  { a: "Participation text", b: "your repost terms" },
];

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "How does it know which posts belong to today?",
    a: "A post counts for a day when it mentions your account, uses your challenge hashtag and that day's hashtag, and was posted inside that day's window. You set the rules once; each day inherits them.",
  },
  {
    q: "What happens to posts that break a rule?",
    a: 'They\'re set aside automatically, with the reason, like "posted Oct 15, before Day 16 opened". You don\'t need to review them. Nothing is deleted, so you can still include one if you go looking.',
  },
  {
    q: "Do I still choose the featured work?",
    a: "Always. Nothing is ranked or picked for you. The software sorts and checks; the taste is yours.",
  },
  {
    q: "Do I have to enter my daily prompts?",
    a: "No. Days are simply Day 01 to Day 31, each with a generated hashtag. Keep publishing your prompt list image as you do now. You can add a title to a day if you want it in the caption.",
  },
  {
    q: "Can I feature several creators in one post?",
    a: "Yes. Up to 10, which is Instagram's carousel limit. It's published as a new carousel on your account, with each creator credited.",
  },
  {
    q: "Will it credit creators in the right order?",
    a: "Yes. Credits are numbered in slide order and update whenever you reorder or remove a slide.",
  },
  {
    q: "Can it check that participants follow my account?",
    a: "No, Instagram doesn't allow that. You verify finalists yourself from a link to their profile, once per creator per challenge. If someone isn't verified you'll see a warning, and you can still publish.",
  },
  {
    q: "Who is responsible for permission to repost?",
    a: "You are, through your challenge terms. You can store your participation text in the challenge, and it's referenced when you publish.",
  },
  {
    q: "Can I reuse my challenge next year?",
    a: "Duplicate it. Rules, hashtag templates, caption template and publishing settings carry over, and the hashtags fill in the new year.",
  },
];

/** The one value the LP's own script treats as "not applicable" — excluded from the signup copy. */
export const NOT_DAILY_ANSWER = "I don't feature daily";

export const timeQuizOptions: string[] = [
  "Under 15 minutes",
  "15–30 minutes",
  "30–60 minutes",
  "Over an hour",
  NOT_DAILY_ANSWER,
];

export const frequencyOptions: string[] = [
  "Once a year",
  "Several times a year",
  "Always running / continuous",
];
