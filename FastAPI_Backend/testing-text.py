"""
Final test for the perfected rule-based analyzer
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from analysis_utils import analyze_text_with_context

def run_final_test():
    test_cases = [
        # Negation Tests
        {"text": "I'm not happy with the results", "expected": {"emotion": "sadness", "sentiment": "negative", "negation": True, "sarcasm": False}},
        {"text": "This is not at all disappointing", "expected": {"emotion": "joy", "sentiment": "positive", "negation": True, "sarcasm": False}},
        {"text": "I'm not angry, just disappointed", "expected": {"emotion": "sadness", "sentiment": "negative", "negation": True, "sarcasm": False}},
        {"text": "Never in my life have I been more excited", "expected": {"emotion": "joy", "sentiment": "positive", "negation": True, "sarcasm": False}},
        {"text": "I don't feel scared about the presentation", "expected": {"emotion": "joy", "sentiment": "positive", "negation": True, "sarcasm": False}},
        {"text": "No, I'm not sad anymore", "expected": {"emotion": "joy", "sentiment": "positive", "negation": True, "sarcasm": False}},
        
        # Sarcasm Tests
        {"text": "Oh great, my car broke down again", "expected": {"emotion": "anger", "sentiment": "negative", "negation": False, "sarcasm": True}},
        {"text": "Perfect! Just what I needed today", "expected": {"emotion": "anger", "sentiment": "negative", "negation": False, "sarcasm": True}},
        {"text": "Thanks a lot for your 'help'", "expected": {"emotion": "anger", "sentiment": "negative", "negation": False, "sarcasm": True}},
        {"text": "Well, isn't this just wonderful?", "expected": {"emotion": "anger", "sentiment": "negative", "negation": False, "sarcasm": True}},
        {"text": "I'm so thrilled to be working on a Saturday", "expected": {"emotion": "anger", "sentiment": "negative", "negation": False, "sarcasm": True}},
        {"text": "Oh joy, another meeting that could have been an email", "expected": {"emotion": "anger", "sentiment": "negative", "negation": False, "sarcasm": True}},
        
        # Complex Sentence Tests
        {"text": "I'm happy with the outcome but still worried about the future", "expected": {"emotion": "fear", "sentiment": "negative", "negation": False, "sarcasm": False}},
        {"text": "Although I'm sad to leave, I'm excited for new opportunities", "expected": {"emotion": "joy", "sentiment": "positive", "negation": False, "sarcasm": False}},
        {"text": "I love the idea, however I'm afraid it won't work in practice", "expected": {"emotion": "fear", "sentiment": "negative", "negation": False, "sarcasm": False}},
        {"text": "The news was shocking and terrifying, yet somehow relieving", "expected": {"emotion": "fear", "sentiment": "negative", "negation": False, "sarcasm": False}},
        {"text": "I feel a bit nervous but mostly confident about the presentation", "expected": {"emotion": "joy", "sentiment": "positive", "negation": False, "sarcasm": False}},
        {"text": "It's not that I'm unhappy, I'm just not particularly excited either", "expected": {"emotion": "neutral", "sentiment": "neutral", "negation": True, "sarcasm": False}},
        {"text": "The movie was so sad that it actually made me appreciate my life more", "expected": {"emotion": "joy", "sentiment": "positive", "negation": False, "sarcasm": False}},
        {"text": "Not too bad, could be better", "expected": {"emotion": "joy", "sentiment": "positive", "negation": True, "sarcasm": False}},
    ]
    
    print("🧪 FINAL PERFECTED Test of Rule-Based Analyzer")
    print("=" * 120)
    print(f"{'Category':<8} {'Text':<50} {'Emotion':<10} {'Sentiment':<10} {'Neg':<4} {'Sarc':<5} {'Result':<6}")
    print("-" * 120)
    
    passed = 0
    total = len(test_cases)
    results = []
    
    # Categorize tests
    categories = {
        "negation": test_cases[:6],
        "sarcasm": test_cases[6:12],
        "complex": test_cases[12:]
    }
    
    for category, tests in categories.items():
        for test in tests:
            text = test["text"]
            expected = test["expected"]
            
            # Run analysis
            result = analyze_text_with_context(text)
            
            # Determine sentiment
            pos = result["sentiment"]["positive"]
            neg = result["sentiment"]["negative"]
            neu = result["sentiment"]["neutral"]
            
            if pos > neg and pos > neu:
                actual_sentiment = "positive"
            elif neg > pos and neg > neu:
                actual_sentiment = "negative"
            elif neu > pos and neu > neg:
                actual_sentiment = "neutral"
            else:
                actual_sentiment = "mixed"
            
            # Check matches
            emotion_match = result["emotion"] == expected["emotion"]
            sentiment_match = actual_sentiment == expected["sentiment"]
            negation_match = result["negation_detected"] == expected["negation"]
            sarcasm_match = result["sarcasm_detected"] == expected["sarcasm"]
            
            # Overall pass
            all_match = emotion_match and sentiment_match and negation_match and sarcasm_match
            
            if all_match:
                passed += 1
                result_symbol = "✅"
            else:
                result_symbol = "❌"
            
            # Store result
            results.append({
                "text": text,
                "category": category,
                "passed": all_match,
                "details": {
                    "emotion": {"actual": result["emotion"], "expected": expected["emotion"], "match": emotion_match},
                    "sentiment": {"actual": actual_sentiment, "expected": expected["sentiment"], "match": sentiment_match},
                    "negation": {"actual": result["negation_detected"], "expected": expected["negation"], "match": negation_match},
                    "sarcasm": {"actual": result["sarcasm_detected"], "expected": expected["sarcasm"], "match": sarcasm_match}
                }
            })
            
            # Display
            truncated_text = text[:47] + "..." if len(text) > 50 else text
            print(f"{category:<8} {truncated_text:<50} {result['emotion']:<10} {actual_sentiment:<10} "
                  f"{'✓' if result['negation_detected'] else '✗':<4} {'✓' if result['sarcasm_detected'] else '✗':<5} "
                  f"{result_symbol:<6}")
    
    print("=" * 120)
    print(f"📊 Overall Results: {passed}/{total} passed ({passed/total*100:.1f}%)")
    
    # Category breakdown
    print("\n📈 Category Breakdown:")
    for category in ["negation", "sarcasm", "complex"]:
        category_results = [r for r in results if r["category"] == category]
        category_passed = sum(1 for r in category_results if r["passed"])
        category_total = len(category_results)
        percentage = (category_passed / category_total) * 100 if category_total > 0 else 0
        print(f"  - {category.capitalize():<10}: {category_passed}/{category_total} ({percentage:.1f}%)")
    
    # Show failures
    failures = [r for r in results if not r["passed"]]
    if failures:
        print("\n🔍 Failed Cases Details:")
        for i, failure in enumerate(failures):
            print(f"\n{i+1}. '{failure['text']}'")
            print(f"   Category: {failure['category']}")
            details = failure["details"]
            
            for check in ["emotion", "sentiment", "negation", "sarcasm"]:
                if not details[check]["match"]:
                    print(f"   {check.capitalize()}: Expected {details[check]['expected']}, Got {details[check]['actual']}")
    
    # Performance test
    print("\n⚡ Performance Test:")
    import time
    
    test_texts = [tc["text"] for tc in test_cases[:5]] * 2  # 10 analyses
    start = time.time()
    for text in test_texts:
        analyze_text_with_context(text)
    elapsed = time.time() - start
    
    print(f"Time for 10 analyses: {elapsed:.3f} seconds")
    print(f"Average per analysis: {elapsed/10:.3f} seconds")
    
    return results

if __name__ == "__main__":
    run_final_test()