import numpy as np

# Y = [[3,2],[0,1],[0,4]]

# res = [pos for pos, val in sorted(enumerate(Y), key=lambda x: (x[1][0],x[1][1]))]
# print(res)
# print(Y[1,2,3])

# X = [1,2,3,4,5,6]
# Y = [3,1,2,1,0,1]
# # print(np.argsort(Y))
# mod_1_x_to_ad, mod_2_x_to_ad  = [1, 0] if 1 < 0 else [0, 1]
# print(mod_1_x_to_ad)
# # ordered_nodes = [x for _, x in sorted(zip(Y, X))]
# # nums_in_cl = list(dict(sorted(Counter(Y).items())).values())
# # split_array = [sum(nums_in_cl[:i+1]) for i, _ in enumerate(nums_in_cl)]
# # # print(Counter(Y))
# # print(dict(sorted(Counter(Y).items())))
# # print(split_array)
# # a = np.split(ordered_nodes, split_array)
# # print(a[:-1])
# t = [1,2,3,4]
# te= {1:2,3:4,5:6,7:8}

# for (a1, a2) ,b in zip(te.items(), t):
#     print(a1,a2)
    # print(b)


# mu, sigma = 0, 1/3  
# s = np.random.normal(mu, sigma, 1000)

# print(type(s))

# import matplotlib.pyplot as plt
# count, bins, ignored = plt.hist(s, 30, density=True)
# plt.plot(bins, 1/(sigma * np.sqrt(2 * np.pi)) *
#                np.exp( - (bins - mu)**2 / (2 * sigma**2) ),
#          linewidth=2, color='r')
# plt.savefig('normaldist.png')

print([[pathway for pathway in module] for module in [[1,2,3],[4,5,6]]])