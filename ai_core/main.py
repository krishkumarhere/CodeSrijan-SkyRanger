# ai_core/main.py

from ai_core.pipelines.object_avoidance_pipeline import ObjectAvoidancePipeline

if __name__ == "__main__":
    pipeline = ObjectAvoidancePipeline()
    pipeline.run()