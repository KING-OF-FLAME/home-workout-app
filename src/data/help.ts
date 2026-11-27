/** In-app "How to use" guide. Keep in step with docs/USER_GUIDE.md. */
export interface HelpSection {
  icon: string;
  title: string;
  steps: string[];
}

export const HELP: HelpSection[] = [
  {
    icon: 'rocket',
    title: 'Getting started',
    steps: [
      'Answer the few setup questions: name, goal, level, days per week, plan length, minutes per workout and focus areas.',
      'Your personal plan is built straight away. Everything is saved on this phone; no account and no internet needed.',
      'Change your answers anytime in Profile → Change my plan.',
    ],
  },
  {
    icon: 'calendar',
    title: 'Your personal plan',
    steps: [
      'Today shows the next workout of your plan with "Day X of N". Tap Start to see the exercises, then Start workout.',
      'My plan shows every week: Foundation, Build and Peak phases, a lighter recovery week every 4th week and a final test week.',
      'After each workout, tell us if it felt too easy or too hard. Your next workouts adjust.',
    ],
  },
  {
    icon: 'play-circle',
    title: 'Doing a workout',
    steps: [
      'The animated figure shows the move. The glowing muscles are the ones working; the line under it tells you what to do right now.',
      'Timed moves count down by themselves. For reps, tap Done when you finish the set.',
      'Pause, skip or go back with the buttons. Tap "How to do it" for full instructions; the workout pauses meanwhile.',
      'Close the workout to stop. You can save what you did so far.',
    ],
  },
  {
    icon: 'body',
    title: 'Exercise pages',
    steps: [
      'Every exercise has an animation with pause and slow motion. Many also have real photos: tap "Real photos".',
      'You also get step-by-step instructions, breathing, common mistakes, the muscles worked and what to expect over the weeks.',
      'Tap "Read instructions aloud" to hear them.',
    ],
  },
  {
    icon: 'stats-chart',
    title: 'Progress and muscles',
    steps: [
      'Progress shows workouts, minutes, calories, streaks, a weekly chart, a calendar, your weight and BMI.',
      'Muscles trained this week → Details shows every muscle: sets this week, when you last trained it, whether it is recovering, and exercises to train it more.',
    ],
  },
  {
    icon: 'people',
    title: 'For trainers',
    steps: [
      'Coach tab → "I am a trainer" turns this phone into a trainer phone. No account needed.',
      'Build workout plans and meal plans in Coach → Workout plans / Meal plans.',
      'Tap "Share & sync with students" to turn sharing on. Your phone shows a 10-character code. Keep that screen open.',
      'When a new student enters your code, tap Accept. Then open the student and assign plans.',
      'Once a week (or whenever you like), turn sharing on and ask students to tap Sync now. They get your latest plans; you see their finished workouts.',
      'Remove a student from their page. Their plans are removed from their phone at their next sync.',
    ],
  },
  {
    icon: 'school',
    title: 'For students',
    steps: [
      'Get on the same Wi-Fi as your trainer, or join your trainer’s hotspot.',
      'Coach tab → Join your coach → enter the code your trainer shows → wait for them to tap Accept.',
      'Your plans appear in the Coach tab and on Today. Workouts you finish are sent to your trainer at the next sync.',
      'Tap Sync now each week. If your trainer’s code changed, tap New code first. You will get a weekly reminder.',
      'Tap "Remove this coach" anytime to remove their plans from your phone.',
    ],
  },
  {
    icon: 'help-buoy',
    title: 'If sync does not work',
    steps: [
      'Both phones must be on the same Wi-Fi or hotspot. Mobile data alone does not connect the phones.',
      'The trainer must keep the "Share with students" screen open while students sync.',
      'Some public or office Wi-Fi blocks phones from talking to each other. Use the trainer’s hotspot instead.',
      'A new code is made every time sharing starts. Use the code shown right now.',
    ],
  },
];
