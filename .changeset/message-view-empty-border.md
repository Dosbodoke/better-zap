---
"@better-zap/react": patch
---

`MessageViewEmpty`, the welcome screen `<MessageView />` shows when no conversation is selected, no longer draws a 6px green bottom border. The strip carried no meaning and looked like a progress or connection indicator. Pass `className` to add your own border.
