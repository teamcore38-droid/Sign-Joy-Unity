import numpy as np

# Change this to a file that EXISTS in: .\assets\skeletons\words\
word = "two"

path = fr".\assets\skeletons\words\{word}.npy"
sk = np.load(path)

print("Loaded:", path)
print("shape:", sk.shape)  # should be (30, 126)

# show some raw coordinate values
print("frame0 first 12 values:", sk[0, :12])

# reshape into (frames, hands, landmarks, xyz)
sk4 = sk.reshape(30, 2, 21, 3)
print("frame0 LEFT wrist xyz:", sk4[0, 0, 0])   # landmark 0 = wrist
print("frame0 RIGHT wrist xyz:", sk4[0, 1, 0])