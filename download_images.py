import os
import requests
import json
from PIL import Image
import urllib.request
import pytesseract
import re
import glob
import functools
from bs4 import BeautifulSoup
dirname = os.path.dirname(os.path.realpath(__file__))

@functools.cache
def get_json(url):
    return requests.get(url, headers={"User-Agent": "XY"}).json()

@functools.cache
def get_html(url):
    return requests.get(url, headers={"User-Agent": "XY"})

def get_image(url, save_to):
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-Agent', 'XY')]
    urllib.request.install_opener(opener)
    urllib.request.urlretrieve(url, save_to)

def get_metadata(animal, query):
    if animal == 'rat':
        # Info about rat atlas images are accessible via an API
        api_path = f"http://labs.gaidi.ca/rat-brain-atlas/api.php?{query}"
        return get_json(api_path)
    else:
        assert animal == 'mouse'
        # Info about mouse atlas images are only on a webpage; use bs4 to parse
        base_path = "http://labs.gaidi.ca/mouse-brain-atlas"
        resp = get_html(f"{base_path}?{query}")
        page = BeautifulSoup(resp.text, features="html.parser")
        metadata = {}
        for row in page.select('.row'):
            try:
                lead = row.select('p.lead')[0]
                angle = lead.text.lower()
                image = f"{base_path}/" + row.select('img')[0]['src']
                metadata[angle] = dict(image_url=image)
            except IndexError:
                continue
        return metadata

image_dir = f"{dirname}/images"

os.system(f"mkdir -p {image_dir}")

patterns = dict(
    coronal=r'Bregma\s*([\s\-\.\d]+)\s*mm',
    sagittal=r'Lateral\s*([\s\-\.\d]+)\s*mm'
)

limits = dict(
    rat=dict(
        coronal=('ap',-14.6, 6.7),
        sagittal=('ml',-0.1,4.6),
    ),
    mouse=dict(
        coronal=('ap',-8.24,4.28),
        sagittal=('ml',-0.04,3.72),
    )
)

for animal in ['mouse','rat']:
    for angle in ['coronal','sagittal']:
        coord_name, coord, coord_max = limits[animal][angle]

        prev = None

        while coord <= coord_max + 0.1:
            print(animal,angle,coord)

            # Query labs.gaidi.ca for data about the image
            query = "ml=3&ap=3&dv=3".replace(f"{coord_name}=3", f"{coord_name}={coord}")
            metadata = get_metadata(animal, query)
            image_url = metadata[angle]['image_url']

            # Increment coordinate by 0.1
            coord = round(coord + 0.1, 2)

            # If the image hasn't changed since the previous request, skip it
            if image_url == prev:
                continue
            else:
                prev = image_url

            # Download the image to a temporary file
            get_image(image_url, 'tmp.jpg')

            # Use OCR to extract text from the image and figure out the true
            # coordinate value (since `coord` is approximate)
            string = pytesseract.image_to_string('tmp.jpg')
            try:
                # Parse the text to get the coordinate
                position = re.search(patterns[angle], string).group(1).replace(' ', '')

                # Fix an issue where it skips the minus sign
                if float(position) > 0 and coord < 0:
                    position = f"-{position}"
            except:
                # For certain special cases where OCR fails, hackily fix by
                # hardcoding. Note that we instead could just use the
                # approximate coordinate.
                if animal == 'rat' and angle == 'coronal':
                    if coord in [-6.6,-6.7,-6.8]:
                        position = '-6.72'
                    elif coord in [-3.8,-3.7,-3.6]:
                        position = '-3.80'
                    elif coord == -3.2:
                        position = '-3.30'
                    else:
                        import pdb; pdb.set_trace()
                elif animal == 'mouse' and angle == 'coronal':
                    if coord == 2.46:
                        position = '2.34'
                    else:
                        import pdb; pdb.set_trace()
                elif animal == 'mouse' and angle == 'sagittal':
                    if coord == 1.06:
                        position = '0.96'
                    elif coord == 2.46:
                        position = '2.40'
                    elif coord == 3.56:
                        position = '3.44'
                    else:
                        import pdb; pdb.set_trace()
                else:
                    import pdb; pdb.set_trace()
            print(position)

            # Save the resulting image with a filename that contains all the
            # information
            i = len(glob.glob(f"{image_dir}/{animal}_{angle}*"))
            os.system(f"mv tmp.jpg {image_dir}/{animal}_{angle}_{i:03}_{coord_name}_{position}mm.jpg")
