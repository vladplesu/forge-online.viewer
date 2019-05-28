const DB_NAME = 'sdev-demo-version-control';
const DB_VERSION = 1;
const DB_STORE_NAME = 'elements';

let db;

const openDb = () => {
    console.log('openDb ...');
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = event => {
        db = event.target.result;
        console.log('openDb DONE');
    };

    req.onerror = event => {
        console.error('openDb:', event.target.errorCode);
    };

    req.onupgradeneeded = event => {
        console.log('openDb.onupgradeneeded');
        const store = event.currentTarget.result.createObjectStore(
            DB_STORE_NAME,
            { keyPath: 'guid' }
        );

        store.createIndex('structure', 'structure', { unique: false });
        store.createIndex('segment', 'segment', { unique: false });
        store.createIndex('material', 'material', { unique: false });
    };
};

/**
 * @param {string} store_name
 * @param {string} mode either "readonly" or "readwrite"
 */
const getObjectStore = (store_name, mode) => {
    const tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
};

const displayElements = store => {
    console.log('displayElements');

    if (typeof store === 'undefined')
        store = getObjectStore(DB_STORE_NAME, 'readonly');

    // const $table = $('#quantities table');
    const $tbody = $('#quantities table tbody');
    $tbody.empty();

    let req = store.count();
    req.onsuccess = event => {
        console.log(`Total number of elements: ${event.target.result}`);
    };

    req.onerror = () => {
        console.error('add error', this.error);
    };

    let i = 1;
    const myIndex = store.index('segment');
    req = myIndex.openCursor();
    req.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            // console.log('displayElements cursor: ', cursor);
            const value = cursor.value;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <th scope="row">${i}</th>
                    <td>${value.structure}</td>
                    <td>${value.segment}</td>
                    <td>${value.properties[0].area}</td>
                    <td>${value.material}</td>
                    <td>${Math.round(value.properties[0].volume * 100) /
                        100}</td>`;

            $tbody.append(tr);

            cursor.continue();

            i++;
        } else {
            console.log('No more elements');
        }
    };
};

/**
 * @param {Object} element containing the following keys: guid, dbId, structure, segment, material, properties
 */
const addElements = elements => {
    // console.log('addElement arguments:', arguments);

    const store = getObjectStore(DB_STORE_NAME, 'readwrite');
    let req;
    elements.forEach(element => {
        try {
            req = store.get(element.guid);
        } catch (err) {
            throw err;
        }

        req.onsuccess = event => {
            const data = event.target.result;
            console.log(data);
            if (typeof data === 'undefined') {
                try {
                    req = store.add(element);
                } catch (err) {
                    throw err;
                }
                req.onsuccess = () => {
                    console.log('Insertion in DB successful');
                };
                req.onerror = event => {
                    console.log(
                        'addElement error:',
                        event.target.error.message
                    );
                };
            } else {
                data.properties = [...data.properties, ...element.properties];
                console.log(`Element: ${data.properties} exists`);
                req = store.put(data);
                req.onsuccess = () => {
                    console.log('Elemenet was updated');
                };
            }
        };
    });
};

export { addElements, openDb, displayElements };
