/**
 *
 * @param {Array} arr Array of properties to compare
 * @param {String} prop Name of property to compare
 */
const compare = (arr, prop) => {
    let res = '';
    if (arr.length > 1) {
        res =
            arr[0][prop] > arr[1][prop]
                ? '<span class="badge badge-success">+</span>'
                : arr[0][prop] < arr[1][prop]
                    ? '<span class="badge badge-danger">-</span>'
                    : '';
    }

    return res;
};

export { compare };
