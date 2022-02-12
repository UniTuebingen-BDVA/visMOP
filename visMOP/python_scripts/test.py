import numpy as np

Y = [[3,2],[0,1],[0,4]]

res = [pos for pos, val in sorted(enumerate(Y), key=lambda x: (x[1][0],x[1][1]))]
print(res)
print(Y[1,2,3])

X = [1,2,3,4,5,6]
Y = [3,1,2,1,0,1]
print(np.argsort(Y))
# ordered_nodes = [x for _, x in sorted(zip(Y, X))]
# nums_in_cl = list(dict(sorted(Counter(Y).items())).values())
# split_array = [sum(nums_in_cl[:i+1]) for i, _ in enumerate(nums_in_cl)]
# # print(Counter(Y))
# print(dict(sorted(Counter(Y).items())))
# print(split_array)
# a = np.split(ordered_nodes, split_array)
# print(a[:-1])