# Roshan

🔗 **Live Website:** https://avin-mo.github.io/Roshan/  
📦 **Repository:** https://github.com/Avin-mo/Roshan

Roshan is a Chrome extension that helps readers critically evaluate news articles by highlighting potential propaganda and manipulation techniques directly on the page.

---

## Inspiration

Iran’s recent protests and political events have highlighted how much propaganda can appear in state media. As someone from Iran, I grew up learning to approach state news critically. However, for many people outside the country who trust official sources, recognizing propaganda patterns can be much harder.

Seeing this gap inspired us to build a tool that helps readers recognize common persuasion techniques in news articles. Instead of deciding what is true or false, Roshan highlights patterns often associated with propaganda so users can apply their own critical thinking.

---

## What it does

Roshan is a Chrome extension that analyzes news articles directly in the browser.

It highlights sentences that contain potential manipulation signals such as:

- **Emotional framing**
- **Absolutist language**
- **Vague or unsupported claims**
- **Propaganda-style wording**

When a user hovers over highlighted text, the extension explains why the sentence was flagged. The goal is not to label information as true or false, but to help readers become more aware of persuasive language and possible bias.

---

## Tech Stack

**Frontend**
- JavaScript
- HTML / CSS
- Chrome Extension APIs

**Backend**
- Python
- FastAPI

**Machine Learning**
- Custom text classification model
- Labeled dataset of propaganda-style language

---

## Running the Project

Clone the repository:

```bash
git clone https://github.com/Avin-mo/Roshan.git
cd Roshan