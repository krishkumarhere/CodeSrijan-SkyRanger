import os
import random

BASE_IMAGE_DIR = "sample_images"


def select_image(folder_name):

    folder = os.path.join(
        BASE_IMAGE_DIR,
        folder_name
    )

    if not os.path.exists(folder):
        return None

    images = os.listdir(folder)

    if not images:
        return None

    selected = random.choice(images)

    return os.path.join(folder, selected)