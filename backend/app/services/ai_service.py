
import os
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from app.config import settings

# Configure logging
logger = logging.getLogger(__name__)

class OpenAIService:
    """OpenAI service for question generation and evaluation using ChatGPT."""
    
    def __init__(self):
        """Initialize OpenAI service."""
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL or "gpt-4o"
        
        if not self.api_key:
            logger.warning("OPENAI_API_KEY is not set. AI features will not work.")
        
        self.client = OpenAI(api_key=self.api_key)
    
    def _call_api(self, prompt: str) -> str:
        """Call OpenAI API."""
        try:
            print(f"🤖 Generating with OpenAI Model: {self.model}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4096,
                top_p=1
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"❌ OpenAI API Error: {str(e)}")
            raise e
    
    def generate_mcq(self, keyword: str, difficulty_level: str) -> Dict[str, Any]:
        """Generate MCQ question."""
        prompt = f"""You are an expert technical interviewer creating multiple-choice questions.

**Task**: Create ONE high-quality multiple-choice question based on the following keyword.

**Keyword**: {keyword}
**Difficulty Level**: {difficulty_level}

**Requirements**:
1. Test practical knowledge, not just definitions
2. Provide exactly 4 options (A, B, C, D)
3. Only ONE option should be correct
4. Distractors should be plausible but clearly wrong
5. Keep the question concise and clear

**Output Format** (JSON):
{{
  "question": "Your question here?",
  "options": {{
    "A": "First option",
    "B": "Second option",
    "C": "Third option",
    "D": "Fourth option"
  }},
  "correct_answer": "B",
  "explanation": "Brief explanation"
}}

Generate the question now. Return ONLY the JSON, no other text."""

        response = self._call_api(prompt)
        return self._parse_json_response(response)
    
    def generate_coding_question(
        self,
        keyword: str,
        difficulty_level: str,
        previous_performance: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Generate coding question."""
        adaptive_context = ""
        if previous_performance:
            if previous_performance.get("score", 0) >= 8:
                adaptive_context = "\nThe candidate performed well. Increase complexity slightly."
            elif previous_performance.get("score", 0) <= 5:
                adaptive_context = "\nThe candidate struggled. Keep this at similar or easier level."
        
        prompt = f"""You are an expert technical interviewer creating coding challenges.

**Task**: Create ONE coding question based on the following keyword.

**Keyword**: {keyword}
**Difficulty Level**: {difficulty_level}
{adaptive_context}

**Requirements**:
1. Solvable in 5-10 minutes
2. Clear problem statement with examples
3. Include input/output specifications
4. Test understanding of {keyword}

**Output Format** (JSON):
{{
  "question": "Problem statement with examples",
  "input_format": "Description of input",
  "output_format": "Description of expected output",
  "constraints": ["constraint1", "constraint2"],
  "example_input": "Sample input",
  "example_output": "Sample output",
  "hints": ["Optional hint 1"]
}}

Generate the coding question now. Return ONLY the JSON, no other text."""

        response = self._call_api(prompt)
        return self._parse_json_response(response)
    
    def generate_descriptive_question(self, keyword: str, difficulty_level: str) -> Dict[str, Any]:
        """Generate descriptive question."""
        prompt = f"""You are an expert technical interviewer creating conceptual questions.

**Task**: Create ONE descriptive question based on the following keyword.

**Keyword**: {keyword}
**Difficulty Level**: {difficulty_level}

**Requirements**:
1. Test deep understanding, not memorization
2. Should encourage explanation of concepts, use cases, or trade-offs
3. Answerable in 3-5 sentences
4. Avoid yes/no questions

**Output Format** (JSON):
{{
  "question": "Your descriptive question here?",
  "key_points": ["Expected point 1", "Expected point 2", "Expected point 3"],
  "sample_answer": "A good sample answer"
}}

Generate the question now. Return ONLY the JSON, no other text."""

        response = self._call_api(prompt)
        return self._parse_json_response(response)
    
    def evaluate_code(
        self,
        question: Dict[str, Any],
        candidate_code: str,
        language: str = "python"
    ) -> Dict[str, Any]:
        """Evaluate coding answer."""
        prompt = f"""You are an expert code reviewer evaluating a candidate's solution.

**Problem Statement**:
{question.get('question', '')}

**Candidate's Code** ({language}):
```{language}
{candidate_code}
```

**Evaluation Criteria**:
1. **Correctness** (0-10): Does it solve the problem correctly?
2. **Logic** (0-10): Is the approach logical and well-structured?
3. **Efficiency** (0-10): Is the solution optimized?
4. **Code Quality** (0-10): Is it readable and follows best practices?

**Output Format** (JSON):
{{
  "correctness": 8,
  "logic": 9,
  "efficiency": 7,
  "code_quality": 8,
  "overall_score": 8.0,
  "is_correct": true,
  "feedback": "Detailed feedback here",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1"],
  "time_complexity": "O(n)",
  "space_complexity": "O(1)"
}}

Evaluate the code now. Return ONLY the JSON, no other text."""

        response = self._call_api(prompt)
        return self._parse_json_response(response)
    
    def evaluate_descriptive(
        self,
        question: str,
        candidate_answer: str,
        key_points: list
    ) -> Dict[str, Any]:
        """Evaluate descriptive answer."""
        prompt = f"""You are an expert technical interviewer evaluating a conceptual answer.

**Question**:
{question}

**Expected Key Points**:
{chr(10).join(f"- {point}" for point in key_points)}

**Candidate's Answer**:
{candidate_answer}

**Evaluation Criteria**:
1. **Accuracy** (0-10): Is the information technically correct?
2. **Completeness** (0-10): Does it cover the key points?
3. **Clarity** (0-10): Is the explanation clear?
4. **Depth** (0-10): Does it demonstrate deep understanding?

**Output Format** (JSON):
{{
  "accuracy": 9,
  "completeness": 8,
  "clarity": 9,
  "depth": 7,
  "overall_score": 8.25,
  "feedback": "Detailed feedback here",
  "key_points_covered": ["point1", "point2"],
  "missing_points": ["point3"],
  "strengths": ["strength1"],
  "improvements": ["improvement1"]
}}

Evaluate the answer now. Return ONLY the JSON, no other text."""

        response = self._call_api(prompt)
        return self._parse_json_response(response)
    
    def generate_final_report(self, exam_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive final report."""
        prompt = f"""You are a senior technical recruiter creating an evaluation report.

**Candidate**: {exam_data.get('candidate_name')}
**Total Score**: {exam_data.get('total_score')}/100
**Integrity Score**: {exam_data.get('integrity_score')}/100

**Performance Summary**:
- MCQ Score: {exam_data.get('mcq_score', 0)}/100
- Coding Score: {exam_data.get('coding_score', 0)}/100
- Descriptive Score: {exam_data.get('descriptive_score', 0)}/100

**Skill Breakdown**:
{json.dumps(exam_data.get('skill_scores', {}), indent=2)}

**Proctoring**:
- Total Violations: {exam_data.get('total_violations', 0)}
- High Severity: {exam_data.get('high_severity_violations', 0)}

**Your Task**: Analyze performance and provide recommendation.

**Recommendation Guidelines**:
- **proceed**: Total ≥ 70, Integrity ≥ 75
- **review**: Total 50-70 or Integrity 50-75
- **reject**: Total < 50 or Integrity < 50

**Output Format** (JSON):
{{
  "overall_assessment": "2-3 sentence summary",
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "weaknesses": ["Specific weakness 1"],
  "skill_analysis": {{
    "python": "Brief analysis"
  }},
  "proctoring_assessment": "Analysis of integrity",
  "recommendation": "proceed|review|reject",
  "confidence_level": "high|medium|low",
  "detailed_reasoning": "Comprehensive explanation",
  "next_steps": ["Suggested step 1", "Suggested step 2"]
}}

Generate the report now. Return ONLY the JSON, no other text."""

        response = self._call_api(prompt)
        return self._parse_json_response(response)
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from AI response."""
        import re
        
        # Try to find JSON in code block
        json_match = re.search(r'```json\\n(.*?)\\n```', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        # Try to find raw JSON
        json_match = re.search(r'\\{.*\\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        
        # If no JSON found, try parsing entire text
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON: {text}") # debug
            # Fallback: try to find start and end of object manually if regex failed or it's malformed
            try:
                start = text.find('{')
                end = text.rfind('}') + 1
                if start != -1 and end != -1:
                    return json.loads(text[start:end])
            except:
                pass
                
            raise ValueError(f"Could not extract JSON from response: {text[:200]}")


# Global AI service instance
ai_service = OpenAIService()
