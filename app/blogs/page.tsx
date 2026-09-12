"use client";
import React from 'react'
import BlogsPage from './blogspage';
import Footer from '../sabha/footer';
import Nav from './nav';
const blog= () => {
  return (
    <>
  <Nav/>
  <BlogsPage/>
  <Footer/>
    </>
  )
}

export default blog