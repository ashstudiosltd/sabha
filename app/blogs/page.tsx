"use client";
import React, { useState } from 'react'
import BlogsPage from '../components/blogs/blogspage';
import Footer from '../components/blogs/footer';
const blog= () => {
  const [query, setQuery] = useState('');

  return (
    <>
  <BlogsPage/>
  <Footer/>
    </>
  )
}

export default blog