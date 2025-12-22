# Product Requirements Document: Bridge Partnership Quiz App

## Introduction/Overview

The Bridge Partnership Quiz App is a web application designed to help bridge partnerships test and align their bidding agreements. The app enables partners to answer identical bidding-related questions and compare their answers to identify agreements and mismatches. The core UX principle emphasizes alignment and discussion rather than correctness—language should avoid words like "right" or "wrong" and instead focus on agreement and learning opportunities.

The app supports two primary modes:
- **Partnership Mode**: Partners (two or more users) answer quizzes together and compare answers for alignment
- **Class Mode**: Teachers create classes, share quizzes, and students answer individually with aggregate results

The problem this app solves: Bridge partnerships often struggle with unclear agreements and misunderstandings in bidding. By having partners answer the same questions independently and then comparing results, partnerships can identify areas of misalignment and discuss them to improve their bidding system.

## Goals

1. Enable bridge partners to answer identical bidding-related questions independently
2. Allow partners to compare answers per partnership to identify agreements and mismatches
3. Support quiz creation and management for quizmasters
4. Provide clear, actionable results that emphasize learning opportunities rather than errors
5. Support both partnership-based and class-based quiz participation
6. Ensure the app is accessible to bridge players of all levels, from casual partnerships to serious tournament pairs

## User Stories

### Quizmaster Stories

1. **As a quizmaster**, I want to create quizzes with bidding scenarios so that I can test partnership agreements
2. **As a quizmaster**, I want to add questions to my quizzes with auctions and answer types so that partners can be tested on specific bidding situations
3. **As a quizmaster**, I want to mark bids as alerted with their meanings so that players understand the bidding context correctly
4. **As a quizmaster**, I want to publish my quizzes so that they become immutable and shareable
5. **As a quizmaster**, I want to view aggregated results across all partnerships so that I can see which questions cause the most disagreement
6. **As a quizmaster**, I want to see per-partnership results so that I can understand how different partnerships perform
7. **As a quizmaster**, I want to copy existing quizzes so that I can create variations without starting from scratch

### Player Stories (Partnership Mode)

8. **As a player**, I want to create partnerships with other users so that I can take quizzes with specific partners
9. **As a player**, I want to accept partnership invitations so that I can join partnerships created by others
10. **As a player**, I want to start a quiz with a partnership so that all members can answer the same questions
11. **As a player**, I want to answer questions independently so that my answers aren't influenced by my partner's responses
12. **As a player**, I want to see my partner's answers after we've both answered so that we can identify areas of disagreement
13. **As a player**, I want to retake quizzes with the same partnership so that we can track improvement over time
14. **As a player**, I want to see which questions we agreed on and which we disagreed on so that we know what to discuss

### Player Stories (Class Mode)

15. **As a teacher**, I want to create a class and share a link so that students can join easily
16. **As a teacher**, I want to start quizzes for my class so that students know which quiz to take
17. **As a teacher**, I want to see aggregate results for my class so that I can understand common misunderstandings
18. **As a student**, I want to join a class via a link so that I can participate in class quizzes
19. **As a student**, I want to answer quizzes at my own pace so that I'm not rushed
20. **As a student**, I want to see my individual results so that I can understand my performance

## Functional Requirements

### 1. User Account Management

1.1. The system must allow users to create accounts with a username and password
1.2. The system must hash and securely store user passwords
1.3. The system must assign each user a unique invite code upon account creation
1.4. The system must support a single account type that can function as both Quizmaster and Player
1.5. The system must NOT support account deletion

### 2. Partnership Management

2.1. The system must allow users to create partnerships with two or more users
2.2. The system must support partnerships with no owner—all members have equal status
2.3. The system must allow any member of a partnership to invite other users to join
2.4. The system must require invited users to accept before joining a partnership
2.5. The system must allow any member of a partnership to start a quiz using that partnership
2.6. The system must destroy a partnership if any member leaves
2.7. When a partnership is destroyed, the system must:
   - Delete all active (incomplete) quiz attempts for that partnership
   - Retain all completed quiz attempts for historical reference
2.8. The system must allow the same quiz to be completed multiple times with different partnerships

### 3. Class Management

3.1. The system must allow any user to create a class (assuming teacher role)
3.2. The system must assign the creator as the class owner/teacher
3.3. The system must generate a shareable class link for each class
3.4. The system must allow players to join a class at any time via the class link (late joining supported)
3.5. The system must allow only the teacher to start quizzes for the class
3.6. The system must allow only the teacher to control which quiz is active for the class
3.7. The system must allow students to answer quizzes individually at their own pace
3.8. The system must show class results in aggregate only (no agreement scoring for classes)
3.9. The system must operate classes asynchronously by default and not use partnership logic

### 4. Quiz Creation and Management

4.1. The system must allow quizmasters to create quizzes with:
   - Title (required)
   - Description (optional)
   - Topic (single choice, required)
4.2. The system must support two quiz lifecycle states:
   - Draft: editable
   - Published: immutable and cannot be deleted
4.3. The system must allow quizmasters to edit questions in draft quizzes
4.4. The system must allow quizmasters to edit questions in published quizzes until any player has answered that question
4.5. Once any player has answered a question, the system must make that question and its auction read-only and uneditable
4.6. The system must allow quizzes to be shared via public link
4.7. The system must allow users to search quizzes by name
4.8. The system must allow users to filter quizzes by topic
4.9. The system must allow users to copy an existing quiz to create their own version
4.10. Quiz copies must have no attribution to the original creator
4.11. The system must allow quizzes to be used multiple times across different partnerships or classes

### 5. Auction Definition

5.1. The system must allow quizmasters to define auctions with:
   - Dealer: N / E / S / W
   - Vulnerability: None / NS / EW / All
5.2. The system must enforce standard bridge bidding rules:
   - Dealer starts the auction
   - Bidding proceeds clockwise
   - Allowed bids: Pass, Double (only when legally allowed), Redouble (only after a double), Contract bids (Level 1-7, Suit: ♣ ♦ ♥ ♠ NT)
   - A contract bid must outrank the previous contract bid
   - Auction continues until three consecutive passes after a contract bid, or four passes at the start (passed-out hand, if supported)
5.3. The system must allow quizmasters to mark any bid as alerted
5.4. When alerting a bid, the system must require the quizmaster to specify its meaning
5.5. The system must store alert meaning as text (purely informational)
5.6. The system must always display alerts to players during answering and when viewing results
5.7. The system must make alert text immutable once answers exist for the question
5.8. The system must display alert text alongside the auction
5.9. The system must ensure that questions always refer to the last bid in the auction
5.10. The UI must clearly show which bid the question refers to and whether that bid is alerted, to avoid misinterpretation

### 6. Question Types and Answer Types

6.1. Each question must have exactly one answer type
6.2. The system must support the following answer types:

#### 6.2.1. Forcing / Non-Forcing
6.3. The system must make this answer type available only when the last bid is a contract bid or pass
6.4. The system must allow players to select one option: Forcing or Non-forcing

#### 6.2.2. Double Interpretation
6.5. The system must make this answer type available only if the last bid is a Double
6.6. The system must NOT allow Forcing/Non-forcing for doubles
6.7. The system must provide this as a single-choice multiple choice question
6.8. The system must provide default options: Penalty, Take-out, Values
6.9. The system must allow quizmasters to add additional custom options

#### 6.2.3. Free Answer (Structured)
6.10. The system must NOT allow free text input for this answer type
6.11. The system must require answers to be constructed using UI buttons (no keyboard input)
6.12. The system must enforce a fixed order for answer structure:
   - Intent (mandatory): Examples include FG, F, INV, NF, SI
   - Suit (optional): ♣ ♦ ♥ ♠ NT
   - Strength (HCP) (optional): Formats include ≥ x HCP, x HCP, ≤ x HCP, < x HCP, x–y HCP
6.13. The system must enforce ordering and validity of structured answers
6.14. The system must be designed to allow additional intents, symbols, or strength formats to be added later (extensibility)

#### 6.2.4. Multiple Choice
6.15. The system must allow quizmasters to create custom options for multiple choice questions
6.16. The system must require players to select exactly one option

### 7. Quiz Participation (Partnership Mode)

7.1. The system must allow players to invite any partner to a quiz
7.2. The system must NOT require the partner to accept before starting the quiz
7.3. The system must allow each player to answer questions independently
7.4. The system must allow a quiz to be retaken multiple times with the same partnership
7.5. The system must allow players to skip questions, but require all questions to be answered to complete the quiz
7.6. The system must NOT provide a "don't know" option
7.7. After selecting an answer, the system must require the player to confirm by proceeding to the next question
7.8. The system must allow answers to be edited until all members of the partnership have answered the question
7.9. The system must hide answers until all members have answered
7.10. Once all members have answered, the system must immediately make answers visible to all members
7.11. The system must NOT pre-fill answers from previous attempts
7.12. The system must link answers by:
   - Quiz ID
   - Partnership ID
   - Attempt ID (timestamped)

### 8. Quiz Participation (Class Mode)

8.1. The system must allow students to answer quizzes individually (not as partnerships)
8.2. The system must allow students to answer at their own pace
8.3. The system must show only aggregate results for classes (no individual answer comparisons)
8.4. The system must allow students to see their own individual results

### 9. Agreement Scoring

9.1. For partnership mode, the system must consider a question agreed only if all members give the same answer
9.2. If any member gives a different answer, the system must mark the question as not agreed
9.3. The system must NOT apply agreement scoring to class mode

### 10. Results and Analytics (Quizmaster View)

10.1. The system must provide quizmasters with a quiz overview showing:
   - For each question: % of partnerships with same answer vs. different answers
10.2. The system must show a list of all partnerships that completed the quiz
10.3. For each partnership, the system must display:
   - Overall score (% same answers)
   - Completion status: Individual completion per member and partnership completion (questions answered by all members)
10.4. The system must provide a partnership detail view showing:
   - Question-by-question answers for a selected partnership and attempt
   - Raw answers shown side-by-side
   - Indication of match/mismatch
10.5. The system must provide a question detail view showing:
   - Distribution of answers for a selected question
   - % agreement per answer
10.6. Results views must emphasize disagreement as learning opportunities, not as errors

### 11. Results and Analytics (Player View)

11.1. The system must always clearly show which context the player is in (partnership vs. class) when viewing results
11.2. For partnership mode, the system must require players to select a partner first
11.3. After selecting a partner, the system must show:
   - All quizzes completed together
   - Multiple attempts per quiz
11.4. For each quiz result (per partner), the system must display:
   - Overall % same answers (per attempt)
   - Completion indicators: Individual completion per member and partnership completion
   - Per-question match/mismatch
   - Side-by-side raw answer comparison

### 12. User Experience Requirements

12.1. The default landing experience must be Player mode, not Quizmaster mode
12.2. The default mental model for users must be answering questions, not managing structure
12.3. Partnership or class context must feel secondary during answering
12.4. The app must clearly communicate that the goal is alignment, not correctness
12.5. Language throughout the app must avoid words like "right" or "wrong"
12.6. Language must emphasize agreement and discussion

### 13. Platform and Technical Requirements

13.1. The system must be a web application that is mobile-friendly
13.2. The system must NOT require a native app
13.3. The system must NOT require app store deployment
13.4. The system must be free to use
13.5. The system may provide an optional, non-blocking "Donate" option
13.6. The system must NOT store personal data
13.7. All quiz data and results must be visible to all involved users
13.8. The system must NOT provide anonymity between participants or quizmasters
13.9. The system must allow users to remove their participation from a quiz attempt

## Non-Goals (Out of Scope)

1. **Account Deletion**: Account deletion functionality is explicitly not supported
2. **Native Mobile Apps**: No native iOS or Android apps will be developed
3. **App Store Deployment**: The app will not be deployed to app stores
4. **Monetization**: The app is free to use (donation option is optional and non-blocking)
5. **Personal Data Collection**: No personal data beyond username and password will be stored
6. **Anonymity**: All participants and quizmasters are visible to each other
7. **Real-time Collaboration**: Quiz answering is asynchronous; players do not need to answer simultaneously
8. **Video/Audio Features**: No multimedia features for auctions or explanations
9. **AI/ML Features**: No automated answer checking, suggestions, or recommendations
10. **Tournament Management**: No built-in tournament or competition management features
11. **Bidding System Templates**: No pre-built bidding system templates (quizzes are custom-created)
12. **Mobile App Push Notifications**: No push notification system

## Design Considerations

### UX Principles

1. **Alignment Over Correctness**: The entire UI must reinforce that the goal is alignment, not correctness. Use language like "agreed/disagreed" instead of "correct/incorrect"
2. **Context Clarity**: Players must always clearly see which context they are in (partnership vs. class) when viewing results
3. **Question Context**: The UI must clearly show which bid the question refers to and whether that bid is alerted, to avoid misinterpretation
4. **Learning Opportunities**: Results views must emphasize disagreement as learning opportunities, not as errors
5. **Answering-First Mental Model**: The default mental model should be answering questions, with partnership/class context feeling secondary during the answering flow

### UI Requirements

1. **Auction Display**: Auctions must be clearly displayed with visual indicators for:
   - Which bid is the last bid (the one the question refers to)
   - Which bids are alerted
   - Alert meanings (displayed alongside the auction)
2. **Answer Input**: 
   - Free Answer type must use UI buttons only (no keyboard input)
   - All answer types must have clear confirmation before proceeding
3. **Results Display**:
   - Side-by-side answer comparison for partnerships
   - Clear match/mismatch indicators
   - Aggregate statistics for quizmasters
   - Individual results for class students
4. **Mobile Responsiveness**: All features must be accessible and usable on mobile devices

## Technical Considerations

1. **Authentication**: Implement secure password hashing (e.g., bcrypt)
2. **Database Schema**: Design to support:
   - Users with unique invite codes
   - Partnerships (many-to-many relationship with users)
   - Classes with teacher-student relationships
   - Quizzes with draft/published states
   - Questions with read-only enforcement once answered
   - Answers linked to quiz, partnership/class, and attempt
3. **State Management**: 
   - Quiz lifecycle (draft → published)
   - Question editability (editable → read-only once answered)
   - Answer visibility (hidden until all partnership members answer)
4. **Data Integrity**: 
   - Enforce that questions become read-only once any player answers
   - Handle partnership destruction and cleanup of incomplete attempts
   - Retain completed attempts even after partnership destruction
5. **Extensibility**: Design answer types (especially Free Answer structured format) to allow future additions of intents, symbols, or strength formats
6. **Performance**: Consider indexing for:
   - Quiz searches by name
   - Quiz filtering by topic
   - Partnership lookups
   - Answer aggregation queries

## Open Questions

1. **Passed-Out Hands**: Should the system support four passes at the start (passed-out hand)? The requirement mentions "if supported" - should this be included in v1?
2. **Question Skipping**: Players can skip questions but must answer all to complete. Should there be a visual indicator showing which questions are skipped vs. answered?
3. **Quiz Copy Attribution**: Quiz copies have no attribution to the original creator. Should there be any way to see the original quiz, or should copies be completely independent?
4. **Class Size Limits**: Are there any limits on class size or number of students per class?
5. **Partnership Size Limits**: Are there any practical limits on partnership size (e.g., maximum number of members)?
6. **Invite Code Format**: What format should the unique invite codes use? (e.g., alphanumeric, length, case sensitivity)
7. **Quiz Topics**: What are the available topic options? Should this be a predefined list or user-defined?
8. **Attempt History**: How many previous attempts should be retained and displayed? Is there a limit?
9. **Alert Display**: Should alert meanings be shown inline with the auction, in a tooltip, or in a separate section?
10. **Free Answer Extensibility**: While designed for extensibility, what is the initial set of intents, symbols, and strength formats that must be supported?

