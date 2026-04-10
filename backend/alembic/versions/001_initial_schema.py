"""empty init

Revision ID: 001
Revises: 
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create skill_keywords table
    op.create_table(
        'skill_keywords',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('keyword', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('difficulty_level', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_skill_keywords_keyword', 'skill_keywords', ['keyword'])
    
    # Create exams table
    op.create_table(
        'exams',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_name', sa.String(length=255), nullable=True),
        sa.Column('candidate_email', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('total_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('integrity_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('current_difficulty', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_exams_candidate_id', 'exams', ['candidate_id'])
    
    # Create questions table
    op.create_table(
        'questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('keyword_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_type', sa.String(length=50), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('options', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('correct_answer', sa.Text(), nullable=True),
        sa.Column('difficulty_level', sa.String(length=50), nullable=True),
        sa.Column('sequence_number', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ),
        sa.ForeignKeyConstraint(['keyword_id'], ['skill_keywords.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_questions_exam_id', 'questions', ['exam_id'])
    
    # Create answers table
    op.create_table(
        'answers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_answer', sa.Text(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('ai_feedback', sa.Text(), nullable=True),
        sa.Column('time_taken', sa.Integer(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_answers_exam_id', 'answers', ['exam_id'])
    
    # Create proctoring_logs table
    op.create_table(
        'proctoring_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('severity_score', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('video_clip_url', sa.String(length=500), nullable=True),
        sa.Column('event_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_proctoring_logs_exam_id', 'proctoring_logs', ['exam_id'])
    op.create_index('ix_proctoring_logs_timestamp', 'proctoring_logs', ['timestamp'])
    
    # Create final_reports table
    op.create_table(
        'final_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('candidate_name', sa.String(length=255), nullable=True),
        sa.Column('candidate_email', sa.String(length=255), nullable=True),
        sa.Column('total_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('skill_scores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('integrity_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('strengths', sa.Text(), nullable=True),
        sa.Column('weaknesses', sa.Text(), nullable=True),
        sa.Column('recommendation', sa.String(length=50), nullable=True),
        sa.Column('ai_analysis', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('exam_id')
    )
    op.create_index('ix_final_reports_exam_id', 'final_reports', ['exam_id'])


def downgrade():
    op.drop_table('final_reports')
    op.drop_table('proctoring_logs')
    op.drop_table('answers')
    op.drop_table('questions')
    op.drop_table('exams')
    op.drop_table('skill_keywords')
