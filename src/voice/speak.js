/** Local TTS wrapper used by boot and the butler. */
export function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 0.85;
  u.lang = "en-GB";
  const voices = speechSynthesis.getVoices();
  const brit = voices.find((v) => /en-GB|Daniel|UK/i.test(`${v.lang} ${v.name}`));
  if (brit) u.voice = brit;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
