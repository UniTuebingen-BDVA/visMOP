"""
Ideas for metrics:

Variance based metrics like ModVR
Linear regression based metrics:
  - slope  
"""
import numpy as np
from scipy import stats


def get_regression_data(list_of_numbers):
    """
    get regression data as a dictionary for a list of numbers in which each number corresponds to a time point
    """
    x = np.array(range(len(list_of_numbers)))
    y = np.array(list_of_numbers)
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    return {
        "slope": slope,
        "intercept": intercept,
        "r_value": r_value,
        "p_value": p_value,
        "std_err": std_err,
    }
