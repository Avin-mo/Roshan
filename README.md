# Roshan

Roshan is a Chrome extension that helps readers critically evaluate news articles by highlighting potential propaganda and manipulation techniques directly on the page.

Instead of deciding what is true or false, Roshan surfaces signals that may indicate biased or persuasive language. The goal is to give users more information so they can make their own informed judgments.

The project was built for a hackathon and combines a Chrome extension frontend, a FastAPI backend, and a transformer-based text classification model.

---

# Inspiration

Roshan was inspired by the recent protests in Iran and the large amount of propaganda appearing in state-controlled media.

As an Iranian, growing up meant learning that state news sources often contain manipulation and political messaging. However, for many people outside the country who trust their own media systems, these signals are not always easy to recognize.

Seeing international audiences unintentionally repeat or believe narratives from propaganda sources motivated us to build a tool that helps people notice these patterns.

Roshan does not tell users what to believe. Instead, it highlights possible manipulation techniques and encourages readers to apply their own critical thinking.

---

# What Roshan Does

Roshan analyzes the text of news articles and highlights sentences that contain signals commonly associated with propaganda or manipulation.

The extension flags four main categories:

- **Emotional framing**  
  Emotionally charged language intended to influence the reader.

- **Absolutist language**  
  Words such as *always*, *never*, or *everyone* that suggest extreme certainty.

- **Vague or unsupported claims**  
  Statements like “experts say” or “many believe” without evidence.

- **Propaganda-style persuasive language**  
  Language designed to strongly persuade or demonize.

When users hover over highlighted text, the extension explains why the sentence was flagged.

Roshan also integrates an **OpenAI-powered assistant** that allows users to ask questions about highlighted text, explore potential biases, and discuss the article in more depth.

---

# How It Works

Roshan consists of two main components.

## Chrome Extension (Frontend)

The extension:

1. Extracts text from the webpage.
2. Splits the article into sentences.
3. Sends sentences to the backend for analysis.
4. Highlights flagged sentences directly on the page.

Technologies used:

- JavaScript
- HTML
- CSS
- Chrome Extension APIs

---

## FastAPI Backend

The backend receives sentences from the extension and classifies them into propaganda-related categories.

Originally, we attempted to use existing bias-detection libraries such as **Dbias** and **Unbias**, but these projects were outdated and difficult to install. Instead, we trained our own model.

The backend includes:

- A **transformer-based classification model**
- Sentence preprocessing and labeling
- API endpoints for the extension

Technologies used:

- Python
- FastAPI
- NLP preprocessing
- Transformer model

---

# Dataset

Finding a suitable dataset was one of the biggest challenges.

Most propaganda detection datasets were either inaccessible, paid, or did not match our categories.

To solve this, we:

1. Found an existing dataset online.
2. Cleaned and filtered the data.
3. Adapted labels to match our four categories.
4. Used LLMs to generate additional training examples.

This allowed us to build a dataset suitable for training our model within the hackathon timeframe.

---

# Challenges

### Outdated libraries

We initially attempted to integrate **Dbias** and **Unbias**, but these libraries were outdated and difficult to install. This forced us to train our own model instead.

### Dataset limitations

There were very few free datasets available for propaganda detection. We had to clean an existing dataset and generate additional examples to make it usable.

---

# Accomplishments

- Training and deploying our own text classification model
- Building a working Chrome extension that analyzes live news articles
- Integrating AI-assisted discussion using OpenAI
- Creating a propaganda signal detector despite limited data and time

---

# What We Learned

Through this project we learned:

- How to train and deploy a transformer-based text classification model
- How to build and integrate Chrome extensions with a backend API
- How to collaborate effectively using Git
- That AI systems should support human critical thinking rather than replace it

Roshan intentionally avoids making final judgments and instead focuses on surfacing signals for users to evaluate themselves.

---

# Future Work

There are several directions we want to take Roshan next:

- Expand the training dataset to improve model accuracy
- Add more categories of manipulation techniques
- Improve explanations for flagged sentences
- Extend the extension to analyze content on platforms such as Twitter or Instagram
- Improve UI and user interaction with highlighted text

---

# Tech Stack

## Frontend
- Chrome Extension API  
- JavaScript  
- HTML  
- CSS  

## Backend
- Python  
- FastAPI  

## Machine Learning
- Transformer-based text classification model  

## AI Assistant
- OpenAI API  

---

# Project Status

Prototype built during a hackathon. Future work will focus on improving dataset quality, model accuracy, and expanding platform support.