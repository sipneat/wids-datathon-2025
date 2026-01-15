# MVP

## Propsed Solution

A 30-Day Post-Disaster Recovery Companion

- A human-centered platform that activates after evacuations end, helping people rebuild their lives.
- Key Capabilities
  - AI Chatbot that handles:
    - Initial onboarding with 8-10 personalized questions
    - Relocation and housing guidance
      - Temporary and long-term housing pathways
      - Return vs relocation insights based on fire impact history (see Supplementary Data)
      - How are they getting to work
      - How are they getting their kids through school
    - Insurance & Financial Clarity
      - Plain-language explanations of common wildfire insurance outcomes
      - Timelines of what others experienced after similar events
      - Based on what type of insurance you have, calculate cost of living with assistance
    - Family & School Support
      - Help identifying schools in relocation areas
      - Enrollment timelines and transition considerations
      - Abandoned buildings that can be used as temporary structures
    - example prompt: this is my insurance policy, what can i do with this now
      - answer: gives options for all issues listed above
      - MCPs for external data (current news, housing stuff, etc)
      - Kaggle data to provide model with recovery timeline predictions or impact severity classification
    - Should ask initial and follow up questions (budget, health problems)
  - Community Spaces
    - Region-based discussion and peer support
    - Shared recovery experiences and advice
  - Focused on emotional clarity, trust, and next steps, not maps or alerts.

## Supplementary Data

- Kaggle wildfire dataset, summary located in `./kaggle-data/watch_duty_data.md`
  - Final use: Recovery Timeline Prediction
  - Using historical fire progression data to predict when affected users can expect to:
    - Return home (based on containment progression patterns)
    - Access their neighborhood (evacuation zone status change patterns)
    - Begin rebuilding (time from FPS → containment milestones)
  - `containment` progression over time (from changelog)
  - `is_fps` timing
  - `acreage` final vs. when structure threat first reported
  - Evacuation zone `status` duration patterns
  - Fire perimeter growth rate (calculated from time-series perimeters)
- MCPs for external data (current news, housing stuff, etc)

## Tech Stack

- Frontend
  - React
  - TailwindCSS
  - [React UI Chatbot](https://chat-ui.io/docs)
- Backend
  - Python Flask API
    - `requirements.txt` in backend folder
  - Firebase
    - Firestore DB
    - Auth
    - Hosting
- AI Chatbot
  - Groq for LLMs
  - Pinecone for RAG
- External Data
  - NewsAPI
  - Google Maps API
