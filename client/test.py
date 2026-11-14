import os

this_folder = os.path.dirname(os.path.abspath(__file__))
input_file_name = "references.csv"
with open(os.path.join(this_folder, input_file_name), encoding="utf-8", mode="r") as f:
    lines = f.readlines()[1:]

for line in lines[:10]:
    from_ref, to_ref, votes = line.strip().split(",")
