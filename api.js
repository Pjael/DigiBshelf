// --- State ---
let bookshelf = [];      // All books in user's bookshelf
let readingList = [];    // Books to read
let reviews = [];        // User reviews
let likedBooks = [];     // Liked books

// --- DOM Elements ---
const bookshelfPreviewEl = document.querySelector('#bookshelf-preview .bookshelf');
const bookshelfFullEl = document.querySelector('#bookshelf-full .bookshelf');
const readingListEl = document.querySelector('.reading-list');
const reviewListEl = document.querySelector('.review-list');
const browseResultsEl = document.querySelector('.book-results');
const likedBooksEl = document.querySelector('.liked-books');

// --- Google Books API Helper ---
async function searchBooksByGenre(genre) {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=subject:${genre}&maxResults=10`);
    const data = await res.json();
    return data.items || [];
}

// --- Helper: Group array into chunks ---
function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

// --- Render bookshelf with rows and columns ---
function renderBookshelfRows(container, books, booksPerRow = 4) {
    container.innerHTML = '';
    if (!books.length) {
        container.innerHTML = 'div class="empty-message">Your bookshelf is empty. Common add books !</div>';
        return;
    }
    const rows = chunkArray(books, booksPerRow);
    rows.forEach(rowBooks => {
        const row = document.createElement('div');
        row.className = 'shelf-row';
        rowBooks.forEach(book => {
            row.appendChild(createBookCard(book));
        });
        container.appendChild(row);
    });
}

// --- Render Functions ---
function renderBookshelfPreview() {
    renderBookshelfRows(
        bookshelfPreviewEl,
        bookshelf.slice(0, 6), // Show first 6 books in preview
        3 // 3 books per row in preview
    );
}

function renderBookshelfFull() {
    renderBookshelfRows(
        bookshelfFullEl,
        bookshelf,
        4 // 4 books per row in full view
    );
}

// Helper: Add book to bookshelf if not already present
function addToBookshelf(book) {
    const id = book.id || (book.volumeInfo && book.volumeInfo.title);
    if (!bookshelf.some(b => (b.id || (b.volumeInfo && b.volumeInfo.title)) === id)) {
        bookshelf.push(book);
        saveUserData();
        renderBookshelfPreview();
        renderBookshelfFull();
        showToast('Book added to bookshelf :]');
    }
}

function renderReadingList() {
    const notReadEl = document.querySelector('.reading-list.not-read');
    const readEl = document.querySelector('.reading-list.read');
    notReadEl.innerHTML = '';
    readEl.innerHTML = '';

    let notReadCount = 0;
    let readCount = 0;

    readingList.forEach((item, idx) => {
        const li = document.createElement('li');
        li.textContent = item.title;

        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = item.read ? 'Mark as Not Read' : 'Mark as Read';
        toggleBtn.onclick = () => {
            readingList[idx].read = !readingList[idx].read;
            saveUserData();
            renderReadingList();
        };

        //remove button 
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove'; 
        removeBtn.style.marginLeft = '0.5rem';
        removeBtn.onclick = () => {
            readingList.splice(idx, 1);
            saveUserData();
            renderReadingList();
            showToast('Book removed from reading list :[');
        };

        document.getElementById('add-to-reading-list').addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('book-title').value.trim();
            const author = document.getElementById('book-author').value.trim();
            if (!title || !author) return;

            const li = document.createElement('li');
            li.textContent = `${title} by ${author}`;
            // Add a button to mark as read
            const markReadBtn = document.createElement('button');
            markReadBtn.textContent = 'Mark as Read';
            markReadBtn.type = 'button';
            markReadBtn.onclick = function() {
                document.querySelector('.reading-list.read').appendChild(li);
                markReadBtn.remove();
            };
            li.appendChild(markReadBtn);

            document.querySelector('.reading-list.not-read').appendChild(li);

            // Reset form
            this.reset();
        });

        li.appendChild(toggleBtn);
        li.appendChild(removeBtn);

        if (item.read) {
            readEl.appendChild(li);
            readCount++;
        } else {
            notReadEl.appendChild(li);
            notReadCount++;
        }
    });
    if (notReadCount === 0) {
        notReadEl.innerHTML = '<li class="empty-message">No books to read.</li>';
    }
    if (readCount === 0) {
        readEl.innerHTML = '<li class="empty-message">No books read yet.</li>';
    }
}

function renderReviews() {
    reviewListEl.innerHTML = '';
    reviews.forEach(r => {
        const div = document.createElement('div');
        div.className = 'review';
        div.textContent = `"${r.text}" – ${r.bookTitle}`;
        reviewListEl.appendChild(div);
    });
}

function getReviewsForBook(book) {
    const id = book.id || (book.volumeInfo && book.volumeInfo.title);
    return reviews.filter(r => r.bookId === id);
}

//render reviews in modal
function renderModalReviews(book) {
    const reviewsList = document.getElementById('modal-reviews-list');
    reviewsList.innerHTML = '';
    const bookReviews = getReviewsForBook(book);
    if (bookReviews.length === 0) {
        reviewsList.textContent = 'No reviews yet.';
    } else {
        bookReviews.forEach(r => {
            const div = document.createElement('div');
            div.className = 'review';
            div.textContent = r.text;
            reviewsList.appendChild(div);
        });
    }
}

function renderBrowseResults(books) {
    browseResultsEl.innerHTML = '';
    books.forEach(book => {
        browseResultsEl.appendChild(createBookCard(book, true, true));
    });
}

function renderLikedBooks() {
    if (!likedBooksEl) return;
    likedBooksEl.innerHTML = '';
    if (!likedBooks.length) {
        likedBooksEl.innerHTML = '<div class="empty-message">No liked books yet.</div>';
        return;
    }

    likedBooks.forEach((book, idx) => {
        const card = createBookCard(book);
        // Add remove button
        const removeBtn = document.createElement('buton');
        removeBtn.textContent = 'Remove';
        removeBtn.style.marginLeft = '0.5rem';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            likedBooks.splice(idx, 1);
            saveUserData();
            renderLikedBooks();
        };
        card.appendChild(removeBtn);
        likedBooksEl.appendChild(card);
    });
}

function createBookCard(book, showLike = true, showAddToBookshelf = false) {
    const div = document.createElement('div');
    div.className = 'book';

    const title = book.title || (book.volumeInfo && book.volumeInfo.title) || 'Untitled';
    const image =
        book.image ||
        (book.volumeInfo && book.volumeInfo.imageLinks && book.volumeInfo.imageLinks.thumbnail) ||
        'default-cover.png';

    div.innerHTML = `
        <img 
            src="${image}" 
            alt="${title}" 
            style="width:var(--book-width,80px);height:var(--book-height,110px);object-fit:cover;border-radius:6px;display:block;margin:0 auto 0.5rem auto;"
        >
        <div class="book-title" style="font-size:0.95rem;text-align:center;word-break:break-word;">${title}</div>
    `;

    // Like button (heart icon)
    if (showLike) {
        const likeBtn = document.createElement('button');
        likeBtn.textContent = likedBooks.some(b => (b.id || b.title) === (book.id || book.title)) ? '♥' : '♡';
        likeBtn.title = 'Like this book';
        likeBtn.style.marginLeft = '0.5rem';
        likeBtn.onclick = (e) => {
            e.stopPropagation();
            const alreadyLiked = likedBooks.some(b => (b.id || b.title) === (book.id || book.title));
            if (!alreadyLiked) {
                likedBooks.push(book);
                saveUserData();
                renderLikedBooks();
                likeBtn.textContent = '♥';
                showToast('Book liked!');
            } else {
                likedBooks = likedBooks.filter(b => (b.id || b.title) !== (book.id || book.title));
                saveUserData();
                renderLikedBooks();
                likeBtn.textContent = '♡';
                showToast('Book unliked!');
            }
        };
        div.appendChild(likeBtn);
    }

    // Add to Bookshelf button (for search results)
    if (showAddToBookshelf) {
        const addBtn = document.createElement('button');
        const onShelf = bookshelf.some(b => (b.id || (b.volumeInfo && b.volumeInfo.title)) === (book.id || (book.volumeInfo && book.volumeInfo.title)));
        addBtn.textContent = onShelf ? 'On Bookshelf' : 'Add to Bookshelf';
        addBtn.disabled = onShelf;
        addBtn.style.marginLeft = '0.5rem';
        addBtn.onclick = (e) => {
            e.stopPropagation();
            if (!onShelf) {
                addToBookshelf(book);
                addBtn.textContent = 'On Bookshelf';
                addBtn.disabled = true;
                showToast('Book added to bookshelf!');
            }
        };
        div.appendChild(addBtn);
    }

    // Show modal on card click (except when clicking buttons)
    div.onclick = () => showBookModal(book);
    return div;
}


// Helper: Get rating for a book (by id)
function getRatingForBook(book) {
    const id = book.id || (book.volumeInfo && book.volumeInfo.title);
    const found = ratings.find(r => r.bookId === id);
    return found ? found.value : 0;
}

// Helper: Set rating for a book
function setRatingForBook(book, value) {
    const id = book.id || (book.volumeInfo && book.volumeInfo.title);
    const idx = ratings.findIndex(r => r.bookId === id);
    if (idx === -1) {
        ratings.push({ bookId: id, value });
    } else {
        ratings[idx].value = value;
    }
    saveUserData();
}


// --- Local Storage Helpers ---
function saveUserData() {
    localStorage.setItem('bookshelf', JSON.stringify(bookshelf));
    localStorage.setItem('readingList', JSON.stringify(readingList));
    localStorage.setItem('reviews', JSON.stringify(reviews));
    localStorage.setItem('likedBooks', JSON.stringify(likedBooks));
    localStorage.setItem('ratings', JSON.stringify(ratings));
}

function loadUserData() {
    bookshelf = JSON.parse(localStorage.getItem('bookshelf')) || [];
    readingList = JSON.parse(localStorage.getItem('readingList')) || [];
    reviews = JSON.parse(localStorage.getItem('reviews')) || [];
    likedBooks = JSON.parse(localStorage.getItem('likedBooks')) || [];
    ratings = JSON.parse(localStorage.getItem('ratings')) || [];
}

// --- Main Initialization ---
window.onload = async function() {
    // Load user data from local storage
    loadUserData();

    // Render all sections
    renderBookshelfPreview();
    renderBookshelfFull();
    renderReadingList();
    renderReviews();
    renderLikedBooks();

    // Set up event listeners
    const viewAllBtn = document.querySelector('.view-all-btn');
    const backBtn = document.querySelector('.back-btn');
    const genreSearch = document.getElementById('genre-search');

    if (viewAllBtn && backBtn) {
        viewAllBtn.onclick = function() {
            document.getElementById('bookshelf-preview').style.display = 'none';
            document.getElementById('bookshelf-full').style.display = 'block';
        };
        backBtn.onclick = function() {
            document.getElementById('bookshelf-full').style.display = 'none';
            document.getElementById('bookshelf-preview').style.display = 'block';
        };
    }

    // Close modal when clicking the close button or outside modal content
    document.getElementById('close-modal').onclick = hideBookModal;
    document.getElementById('book-modal').onclick = function(e) {
        if (e.target === this) hideBookModal();
    };

    if (genreSearch) {
        genreSearch.onsubmit = async function(e) {
            e.preventDefault();
            const genre = document.getElementById('genre').value;
            const books = await searchBooksByGenre(genre);
            renderBrowseResults(books);
        };
    }

    // Search form for title/author
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.onsubmit = async function(e) {
            e.preventDefault();
            const query = document.getElementById('search-query').value.trim();
            if (!query) return;
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`);
            const data = await res.json();
            renderBrowseResults(data.items || []);
        };
    }

    //Sorting/filetering 
    const sortSelect = document.getElementById('sort-select');
    const filterRead = document.getElementById('filter-read');
    function getSortedFilteredBooks() {
        let books = [...bookshelf];
        if (filterRead && filterRead.checked) {
            const readIds = readingList.filter(b => b.read).map(b => b.id || b.title);
            books = books.filter(b => !readIds.includes(b.id || (b.volumeInfo && b.volumeInfo.title)));
        }
        if (sortSelect) {
            const sortBy = sortSelect.value;
            if (sortBy === 'title') {
                books.sort((a, b) => (a.title || (a.volumeInfo && a.volumeInfo.title)).localeCompare(b.title || (b.volumeInfo && b.volumeInfo.title)));
            } else if (sortBy === 'date') {
                books.sort((a, b) => {
                    const dateA = new Date(a.publishedDate || (a.volumeInfo && a.volumeInfo.publishedDate));
                    const dateB = new Date(b.publishedDate || (b.volumeInfo && b.volumeInfo.publishedDate));
                    return dateB - dateA; // Newest first
                });
            }
            return 0;
        }
    }
    return books;
};

// Show book details in modal
function showBookModal(book) {
    const info = {...(book.volumeInfo || {}), ...book};
    document.getElementById('modal-book-cover').innerHTML =
        `<img src="${(info.imageLinks && info.imageLinks.thumbnail) || book.image || 'default-cover.png'}" alt="${info.title || book.title}">`;
    
    document.getElementById('modal-book-authors').textContent = info.authors ? `Author(s): ${info.authors.join(', ')}` : '';
    // Only show year
    let year = '';
    if (info.publishedDate) {
        year = info.publishedDate.slice(0, 4);
    }
    document.getElementById('modal-book-date').textContent = year ? `Year: ${year}` : '';
    document.getElementById('modal-book-genre').textContent = info.categories ? `Genre: ${info.categories.join(', ')}` : '';
    document.getElementById('modal-book-summary').textContent = info.description || 'No summary available.';
    const currentRating = getRatingForBook(book);
    document.getElementById('modal-book-rating').textContent = currentRating ? `Your Rating: ${'★'.repeat(currentRating)}${'☆'.repeat(5-currentRating)}` : 'No rating yet.';

    const titleE1 = document.getElementById('modal-book-title');
    if (titleE1) {
        titleE1.textContent = info.title || 'Untitled';
    }


    // Add to reading list button
    let addBtn = document.getElementById('modal-add-reading-list');
    if (!addBtn) {
        addBtn = document.createElement('button');
        addBtn.id = 'modal-add-reading-list';
        addBtn.style.marginTop = '0.7rem';
        document.querySelector('.modal-content').appendChild(addBtn);
    }
    // Check if already in reading list
    const idx = readingList.findIndex(
        b => (b.id || b.title) === (book.id || info.title)
    );
    if (idx === -1) {
        addBtn.textContent = 'Add to Not Yet Read';
        addBtn.onclick = () => {
            readingList.push({
                id: book.id || info.title,
                title: info.title,
                read: false
            });
            saveUserData();
            renderReadingList();
            addBtn.textContent = 'Added!';
            addBtn.disabled = true;
        };
        addBtn.disabled = false;

    } else {
        addBtn.textContent = readingList[idx].read ? 'Move to Not Yet Read' : 'Move to Read';
        addBtn.onclick = () => {
            readingList[idx].read = !readingList[idx].read;
            saveUserData();
            renderReadingList();
            addBtn.textContent = readingList[idx].read ? 'Move to Not Yet Read' : 'Move to Read';
        };
        addBtn.disabled = false;
    }

    // Add/Remove from bookshelf button
    let shelfBtn = document.getElementById('modal-bookshelf-btn');
    if (!shelfBtn) {
        shelfBtn = document.createElement('button');
        shelfBtn.id = 'modal-bookshelf-btn';
        shelfBtn.style.marginTop = '0.7rem';
        document.querySelector('.modal-content').appendChild(shelfBtn);
    }
    const id = book.id || info.title;
    const onShelf = bookshelf.some(b => (b.id || (b.volumeInfo && b.volumeInfo.title)) === id);
    if (onShelf) {
        shelfBtn.textContent = 'Remove from Bookshelf';
        shelfBtn.onclick = () => {
            // Remove from bookshelf
            let bookshelf = bookshelf.filter(b => (b.id || (b.volumeInfo && b.volumeInfo.title)) !== id);
            saveUserData();
            renderBookshelfPreview();
            renderBookshelfFull();
            shelfBtn.textContent = 'Add to Bookshelf';
        };
    } else {
        shelfBtn.textContent = 'Add to Bookshelf';
        shelfBtn.onclick = () => {
            addToBookshelf(book);
            shelfBtn.textContent = 'Remove from Bookshelf';
        };
    }

    const modal = document.getElementById('book-modal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Modal element not found');
        return;
    }

    //render reviews for this book
    renderModalReviews(book);

    // Set up review form
    const reviewForm = document.getElementById('modal-review-form');
    const reviewText = document.getElementById('modal-review-text');   
    if (reviewForm) {
        reviewForm.onsubmit = (e) => {
            e.preventDefault();
            const review = reviewText.value.trim();
            if (!review) return;
            const bookId = book.id || info.title;
            reviews.push({ text: review, bookId, bookTitle: info.title });
            saveUserData();
            renderModalReviews(book);
            reviewText.value = ''; // Clear input
        };
    }

    // Set up rating stars
    const ratingSection = document.getElementById('modal-rating-stars');
    ratingSection.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.textContent = i <= currentRating ? '★' : '☆';
        star.style.cursor = 'pointer';
        star.style.fontSize = '1.5rem';
        star.style.color = i <= currentRating ? '#f5b642' : '#ccc';
        star.onclick = () => {
            setRatingForBook(book, i);
            showBookModal(book); // re-render modal to update stars
            showToast(`You rated this book ${i} star${i > 1 ? 's' : ''}!`);
        };
        ratingSection.appendChild(star);
    }
};

// Hide modal
function hideBookModal() {
    document.getElementById('book-modal').style.display = 'none';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    toast.style.display = 'block';
    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.display = 'none';
    }, 1800);
}
