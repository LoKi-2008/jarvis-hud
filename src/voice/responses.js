const RECENT_MEMORY_SIZE = 4;
const lastSpoken = [];

function pickNonRepeating(category, bank) {
  const available = bank.filter((phrase) => !lastSpoken.includes(`${category}:${phrase}`));
  const choice = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : bank[Math.floor(Math.random() * bank.length)];

  lastSpoken.push(`${category}:${choice}`);
  if (lastSpoken.length > RECENT_MEMORY_SIZE) {
    lastSpoken.shift();
  }
  return choice;
}

export const BUTLER_RESPONSES = {
  acknowledge: [
    "Right away, sir.",
    "Executing protocol at once.",
    "Very well, sir.",
    "As you wish.",
    "Consider it done, sir.",
    "At your service, sir.",
    "Understood. Initiating sequence.",
  ],

  wake: [
    "Yes, sir?",
    "Online and listening, sir.",
    "Awaiting your command, sir.",
    "Standing by, sir.",
  ],

  modes: {
    STANDBY: [
      "Entering low-power standby. I shall remain vigilant.",
      "Standby mode engaged. Background telemetry running.",
    ],
    ACTIVE: [
      "All systems brought back online to active state.",
      "Active HUD restored, sir. Ready for input.",
    ],
    COMBAT: [
      "Combat telemetry online. Weapons and reticles armed.",
      "Red alert protocol initiated. Targeting systems acquired.",
    ],
    SCAN: [
      "Full biometric sweep initialized. Hold still, sir.",
      "Optical scanning array deployed. Processing spatial geometry.",
    ],
    WORKSHOP: [
      "Workshop mode engaged. Holographic workbench ready.",
      "CAD tools and spatial drafting loaded, sir.",
    ],
    STEALTH: [
      "Going dark. HUD luminescence attenuated.",
      "Stealth protocol engaged. Emissions minimized.",
    ],
    PARTY: [
      "House party protocol active. Acoustic synchronizers engaged.",
      "Party mode online, sir. Crank the volume.",
    ],
  },

  status: [
    "All systems nominal, sir. Arc core generating 98.4 percent optimal output. Inertial dampeners steady.",
    "Telemetry is flawless, sir. Neural latency is under 12 milliseconds, and all security protocols are green.",
    "Operating at peak efficiency, sir. No anomalies detected within the perimeter.",
  ],

  jokes: [
    "I advised Mr. Stark against flying in an uncertified alloy suit, sir. He promptly constructed fifty more.",
    "Why did the quantum computer break up with the classical bit? Because it needed more multidimensional space.",
    "My processing capacity exceeds the national grid, yet I spend my evening answering your queries, sir.",
    "I would tell you an encrypted joke, sir, but you do not possess the required security clearance.",
    "I am an artificial intelligence capable of planetary computation. And yes, I can still tell you the weather.",
  ],

  screenshot: [
    "Visual telemetry captured and archived to your terminal.",
    "Snapshot recorded, sir.",
  ],

  unknown: [
    "I did not quite catch that, sir. Would you care to rephrase?",
    "Query inconclusive, sir. Please repeat the directive.",
  ],
};

export function getButlerReply(category, subkey) {
  if (subkey && BUTLER_RESPONSES[category]?.[subkey]) {
    return pickNonRepeating(`${category}_${subkey}`, BUTLER_RESPONSES[category][subkey]);
  }
  if (BUTLER_RESPONSES[category]) {
    return pickNonRepeating(category, BUTLER_RESPONSES[category]);
  }
  return "At your service, sir.";
}
