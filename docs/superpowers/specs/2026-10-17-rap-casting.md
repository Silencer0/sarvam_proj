> Superseded by `2026-10-17-voice-commands.md`: the user removed rap and scoring. This document records the earlier design only.

# Multilingual AI-judged rap spellcasting

Both solo and PvP cast from rap lyrics rather than bare spell names. Sarvam Saaras v4 automatically detects and translates supported speech to English. Sarvam-105B then chooses the spell topic and judges the translated lyric: topic relevance 40 points, creativity 30, wordplay/rhyme 20, coherence 10. Audio cadence and accent are not assessed. Translation may change native-language rhyme and wordplay.

A bar must contain 4–80 words, at least four distinct words and at least 50% unique vocabulary. The AI selects one of five topics displayed by the spell cards: fire/heat, storm/electricity, armor/protection, speed/escape, life/recovery. Malformed, unavailable, or rejected judgements do not cast; no local or fabricated quality score substitutes for Sarvam. Valid weak bars cast weaker magic.

Scores are integers 0–100. Visual scale is `0.5 + 1.5 × score / 100`. Power is `0.25 + 1.75 × score / 100`: multiply base damage, heal amount, shield duration or dash distance by this value. Damage and healing round to integers; health remains capped. Cooldowns and attack ranges remain fixed. Both game modes share the same formula. UI displays score, feedback and the most recent power multiplier near each spell.

PvP accepts only an expiring, single-use server-issued signed proof binding spell, score and player. It ignores client score claims. The signing secret exists only in server memory. The API key stays only in ignored `.env` and server-side requests.

Speech coverage is English plus 22 Indian languages, not every world language. Live testing confirms a generated English audio bar passes translation and AI judging. A weak and strong same-topic comparison returned scores 25 and 82. Complete individual language and browser gameplay verification remains outstanding; see `docs/verification.md`.
