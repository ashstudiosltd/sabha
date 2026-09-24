"use client";
import React, { useState } from 'react'
import BlogsPage from './blogspage';
import Footer from './footer';
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