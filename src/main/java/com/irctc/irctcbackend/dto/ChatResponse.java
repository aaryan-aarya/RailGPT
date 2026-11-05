package com.irctc.irctcbackend.dto;

import java.util.List;

public class ChatResponse {

    private String answer;
    private List<String> suggestions;

    public ChatResponse() {}

    public ChatResponse(String answer) {
        this.answer = answer;
    }

    public ChatResponse(String answer, List<String> suggestions) {
        this.answer = answer;
        this.suggestions = suggestions;
    }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
    public List<String> getSuggestions() { return suggestions; }
    public void setSuggestions(List<String> suggestions) { this.suggestions = suggestions; }
}
