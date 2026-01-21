# UI Guide

This is a guide to creating the UI for our app

## Tech Stack

Located in the `frontend/` folder

- React
- TailwindCSS
  - You are allowed to import UI libraries of your choosing if necessary, as long as they don't sacrifice performance in a major way
- The MVP states using React UI Chatbot for our AI chatbot interface, but this can be changed if needed according to the spec below

## What we want the site to look like
# 30-Day Post-Disaster Recovery Companion - Frontend Prompt

## Project Overview
A **human-centered platform** that activates after evacuations end, helping people rebuild their lives. The frontend should be **calming, trauma-informed, and intuitive**, using **React + TailwindCSS**. The backend, data, and AI Chatbot will exist separately.

---

## Sections to Build

### 1. AI Chatbot
- Conversational interface (like [React UI Chatbot](https://chat-ui.io/docs))  
- Initial onboarding with 8–10 personalized questions  
- Follow-up questions for budget, health, family, and other needs  
- Provides guidance for:
  - **Relocation & Housing**
    - Temporary and long-term housing pathways
    - Return vs relocation insights based on fire impact history
    - How users are commuting to work
    - How users manage their kids’ schooling
  - **Insurance & Financial Clarity**
    - Plain-language explanations of common wildfire insurance outcomes
    - Timelines of what others experienced after similar events
    - Cost of living calculations based on insurance type and assistance
  - **Family & School Support**
    - Identifying schools in relocation areas
    - Enrollment timelines and transition considerations
    - Temporary structures or abandoned buildings available
- Example prompt:  
  *“This is my insurance policy, what can I do with this now?”*  
  Expected behavior: provide guidance for all above issues, using external MCPs (news, housing) and Kaggle dataset predictions
- **UI considerations:**
  - Display suggested actions as buttons or cards
  - Include calming colors and subtle animations
  - Use placeholder data for now

---

### 2. Community Spaces
- Region-based discussion threads
- Peer support forums
- Cards for posts showing user, time, and content
- Ability to post new advice or reply to others
- Minimal cognitive load, readable fonts, accessible layout

---

### 3. Resources / Supplementary Data
- Display recovery timelines and impact severity predictions based on Kaggle wildfire dataset
- Show insights such as:
  - Estimated return home date
  - Neighborhood access
  - Rebuilding milestones
- Use cards or charts with clear separation
- Option to expand/collapse sections to reduce cognitive load

---

## UI/UX Guidelines
- **Trauma-informed design:** soft blues, greens, or warm neutrals; calming and soothing visual style
- Rounded buttons, inputs, and cards
- Large readable fonts and ample spacing
- Subtle transitions and animations for interactions
- Mobile and desktop responsive design
- Accessibility: keyboard navigation, contrast, readable typography
- Clear separation of sections (Chatbot vs Community vs Resources)

---

## Components to Implement
- `Chatbot.jsx`
- `CommunityPost.jsx`
- `ResourceCard.jsx`
- `Layout.jsx`
- `Navigation.jsx`

**Notes:** Components should be modular, reusable, and integrate with the existing skeleton project without breaking routing or backend connections.

---

## Technical Requirements
- React functional components with hooks
- TailwindCSS for styling
- Placeholder data for now
- Compatible with existing backend (Flask API, Firestore DB, Pinecone, Groq LLM)
- Integration-ready for AI Chatbot and supplementary data sources

---

## Deliverables
- Full frontend specification for all components
- Designed to be **calming, intuitive, and easy to use**
- Clear separation of features for step-by-step recovery guidance