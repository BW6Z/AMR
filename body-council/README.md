# Body Council

An original 2D cooperative card game for desktop and mobile browsers. Each round draws four distinct roles from an eight-role deck; players hold different clues, negotiate two shared actions each round, vote, and discover the consequences over three rounds.

## Run

Requires Node.js 22.13 or later. From this folder, run:

```sh
npm start
```

No third-party dependencies are required. Open http://localhost:3000 on the host computer. Phones on the same Wi-Fi can use the network address printed at startup. The host firewall must allow the port.

Open the same server address on four devices. Choose **Find players**, or create a room and share its six-letter code. The host starts when four people are seated. Matchmaking waits for real people. Practice partners use fixed rules to share clues and support proposals; they are not AI players.

Local play supports the same network. Cross-network play requires deploying this Node service to a server with persistent SQLite storage and a shared HTTPS address. This project has not been published and contains no platform-specific hosting configuration.

## Rules

- At the start of each round, four distinct roles are randomly drawn from the full eight-role deck and dealt to the four seats. Roles may repeat in later rounds. The patient is the shared body, not a player identity.
- Each role has a free special power usable once per round, before a proposal is under vote. Powers and temporary effects reset at the next draw.
- Every player can propose any basic action. Tests and follow-ups go privately to the proposing player. Evidence remains with that player after role changes.
- The fictional cause, X or Y, is chosen once at the start.
- Private information is generated on the server; other players do not receive your private cards or seat credentials.
- Two shared action points per round. Extra supply temporarily permits three. Propose two different actions, or three with that bonus. Three votes in favor execute the plan; two against reopen discussion.
- Tests return next round unless expedited with the second action point. Follow-up readings occur before that round's remedy effect.
- All hidden state is revealed after round three. The end of play does not imply the end of treatment.
- Reopen the same browser to reconnect. Separate players need separate devices or browser profiles; tabs in one profile share a seat credential.
- Rooms expire two hours after the last write. Closing a tab does not release a seat. Active games do not support replacements.

Fictional cases, remedies, and flora changes are simplified learning mechanics, not medical guidance.

## Files

```text
web/index.html        Responsive interface and original vector card art
worker/game.js        Roles, private clues, votes, and consequences
worker/index.js       Room, matchmaking, and game API
database/schema.sql   Room database schema
scripts/build.mjs     Bundle interface and game server
scripts/preview.mjs   Local and LAN game server
tests/                Game rules and privacy checks
```

The server generates `data/` for SQLite and `dist/` for built output. Both are ignored by version control. `.gitignore` prevents runtime data from entering version control.

## Check

```sh
npm test
```

## Eight roles and powers

| Role | Once-per-round power |
| --- | --- |
| Physician | Stabilize: prevent one health loss at resolution. |
| Analyst | Rapid assay: a free immediate diagnostic result, or a follow-up if already diagnosed. |
| Pharmacist | Flora guard: prevent the flora cost of this round remedy. |
| Caregiver | Comfort: restore 1 health, up to 10. |
| Microbiologist | Culture reading: privately identify X or Y without completing a basic test. |
| Prevention Officer | Containment: prevent bacterial growth this round, not health loss or existing bacteria. |
| Resource Manager | Extra supply: add one shared action point this round. |
| Researcher | Field notes: privately read bacteria and normal flora, even before diagnosis. |

Public actions do not depend on role availability. The matching reference is public: A matches X and B matches Y. Practice partners share clues and support proposals, but do not automatically activate their powers. Old saved rooms upgrade once to the new rules, keeping body state, player identities, and previously received evidence.

## Hidden identities

Only your own current role is sent to your browser. Other seats appear as **Hidden role** until the round ends. The full eight-role library is public, but the current draw and other player identities are not. Completed rounds reveal their identities in the decision history. Chat signatures and power announcements do not name the current role or special power. Shared health or resource effects can still provide clues; players may voluntarily reveal their identity in discussion.
