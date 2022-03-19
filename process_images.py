from PIL import Image
import numpy as np
import glob
import os
import json

# Create an object to store atlas filenames
atlases = {}

for f in sorted(glob.glob('images/*.jpg')):
    print(f)

    # Open the jpg and convert it from rgb to rgba
    img = Image.open(f)
    img = img.resize((img.size[0]*2, img.size[1]*2), Image.BICUBIC)
    rgba = img.convert("RGBA")

    # Make pixels which are almost white (all intensities > 200 of 255)
    # partially transparent. Invert other pixels.
    rgba2 = []
    init_data = np.array(list(rgba.getdata()))
    min_intensity = init_data[:,:3].min(axis=1)
    avg_intensity = init_data[:,:3].mean(axis=1)
    is_white = (min_intensity >= 200).reshape(-1,1).astype(int)
    transparency = np.full_like(init_data, 255)
    transparency[:,3] = transparency[:,3] - avg_intensity
    inversion = 255 - init_data
    inversion[:,3] = 255
    xform_data = is_white * transparency + (1 - is_white) * inversion
    xform_data = [
        tuple(a) for a in xform_data
    ]
    rgba.putdata(xform_data)

    # Save it as a png
    new_filename = f.replace('jpg','png')
    rgba.save(new_filename, 'PNG')

    # Record the new image in the atlas
    animal, angle, *_ = f.split('/')[-1].split('_')
    if animal not in atlases:
        atlases[animal] = {}
    if angle not in atlases[animal]:
        atlases[animal][angle] = []
    atlases[animal][angle].append("/"+new_filename)

# Save the atlas
with open('atlases.json', 'w') as f:
    f.write(json.dumps(atlases))
