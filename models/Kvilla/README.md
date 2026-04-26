---
license: apache-2.0
language:
- en
metrics:
- accuracy
library_name: transformers
pipeline_tag: audio-classification
---
# Wav2Vec2ForSpeechClassification
Fine-tuned model based on `https://huggingface.co/r-f/wav2vec-english-speech-emotion-recognition`. The model is trained on the full TESS, RAVDESS, and CREMA datasets. The Github repository is found [here](https://github.com/K-Winkles/Wav2Vec2ForSpeechClassification)

Authored by:
* [Irene Therese Bermejo Patacsil](https://www.linkedin.com/in/irenetherese/)
* [Kiana Alessandra Villaera](https://www.linkedin.com/in/kiana-alessandra/)

## Datasets
* [TESS](https://www.google.com/url?q=https%3A%2F%2Ftspace.library.utoronto.ca%2Fhandle%2F1807%2F24487)
* [RAVDESS](https://www.google.com/url?q=https%3A%2F%2Fzenodo.org%2Frecords%2F1188976%23.YFZuJ0j7SL8)
* [CREMA-D](https://www.kaggle.com/datasets/ejlok1/cremad)

## Performance Metrics
* Test accuracy: 85%
* Test loss: 0.4458

## Overview

The model is based on [Wav2Vec2](https://huggingface.co/docs/transformers/en/model_doc/wav2vec2) and fine-tuned on the aforementioned datasets.