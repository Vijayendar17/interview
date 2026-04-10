"""
Seed script to populate skill keywords in the database.
Run this after database migration to add initial keywords.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.skill_keyword import SkillKeyword


def seed_keywords():
    """Seed initial skill keywords."""
    db = SessionLocal()
    
    keywords_data = [
        # Programming Languages
        {"keyword": "python", "category": "programming_language", "difficulty_level": "beginner"},
        {"keyword": "javascript", "category": "programming_language", "difficulty_level": "beginner"},
        {"keyword": "java", "category": "programming_language", "difficulty_level": "intermediate"},
        {"keyword": "typescript", "category": "programming_language", "difficulty_level": "intermediate"},
        {"keyword": "go", "category": "programming_language", "difficulty_level": "advanced"},
        
        # Frameworks
        {"keyword": "fastapi", "category": "framework", "difficulty_level": "intermediate"},
        {"keyword": "django", "category": "framework", "difficulty_level": "intermediate"},
        {"keyword": "flask", "category": "framework", "difficulty_level": "beginner"},
        {"keyword": "react", "category": "framework", "difficulty_level": "intermediate"},
        {"keyword": "nextjs", "category": "framework", "difficulty_level": "advanced"},
        {"keyword": "vue", "category": "framework", "difficulty_level": "intermediate"},
        {"keyword": "angular", "category": "framework", "difficulty_level": "advanced"},
        
        # Databases
        {"keyword": "postgresql", "category": "database", "difficulty_level": "intermediate"},
        {"keyword": "mysql", "category": "database", "difficulty_level": "beginner"},
        {"keyword": "mongodb", "category": "database", "difficulty_level": "intermediate"},
        {"keyword": "redis", "category": "database", "difficulty_level": "intermediate"},
        
        # Tools & Technologies
        {"keyword": "docker", "category": "tool", "difficulty_level": "intermediate"},
        {"keyword": "kubernetes", "category": "tool", "difficulty_level": "advanced"},
        {"keyword": "git", "category": "tool", "difficulty_level": "beginner"},
        {"keyword": "aws", "category": "tool", "difficulty_level": "advanced"},
        
        # Concepts
        {"keyword": "rest_api", "category": "concept", "difficulty_level": "intermediate"},
        {"keyword": "graphql", "category": "concept", "difficulty_level": "advanced"},
        {"keyword": "microservices", "category": "concept", "difficulty_level": "advanced"},
        {"keyword": "authentication", "category": "concept", "difficulty_level": "intermediate"},
        {"keyword": "algorithms", "category": "concept", "difficulty_level": "intermediate"},
        {"keyword": "data_structures", "category": "concept", "difficulty_level": "intermediate"},
        {"keyword": "oop", "category": "concept", "difficulty_level": "beginner"},
        {"keyword": "async_programming", "category": "concept", "difficulty_level": "advanced"},
    ]
    
    try:
        for kw_data in keywords_data:
            # Check if keyword already exists
            existing = db.query(SkillKeyword).filter_by(keyword=kw_data["keyword"]).first()
            if not existing:
                keyword = SkillKeyword(**kw_data)
                db.add(keyword)
                print(f"✓ Added keyword: {kw_data['keyword']}")
            else:
                print(f"- Skipped (exists): {kw_data['keyword']}")
        
        db.commit()
        print(f"\n✅ Successfully seeded {len(keywords_data)} keywords!")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding keywords: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Seeding skill keywords...\n")
    seed_keywords()
